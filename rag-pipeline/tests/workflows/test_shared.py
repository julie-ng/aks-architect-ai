"""Tests for workflows/shared.py pure helpers + the bounded_fanout logic.

bounded_fanout only uses asyncio (no Temporal runtime), so we can drive it with fake
async "activities" to verify concurrency capping and the early-abort threshold.
"""

import asyncio

import pytest

from workflows import shared
from workflows.shared import FanoutAborted, bounded_fanout, failure_threshold


class TestKeys:
    def test_shard_name_zero_padded(self):
        assert shared.shard_name(0) == "0000.json"
        assert shared.shard_name(42) == "0042.json"
        assert shared.shard_name(3039) == "3039.json"

    def test_shard_key_prefixes(self):
        assert shared.chunk_shard_key(1) == "chunks/0001.json"
        assert shared.tagged_shard_key(1) == "tagged/0001.json"
        assert shared.vector_shard_key(1) == "vectors/0001.json"


class TestFailureThreshold:
    def test_floor_of_20_for_small_runs(self):
        assert failure_threshold(1) == 20
        assert failure_threshold(100) == 20  # 2% = 2, floor wins

    def test_two_percent_for_large_runs(self):
        assert failure_threshold(3040) == 61  # ceil(60.8)
        assert failure_threshold(1000) == 20  # 2% = 20, ties the floor

    def test_scales_above_floor(self):
        assert failure_threshold(5000) == 100


class TestBoundedFanout:
    @pytest.mark.asyncio
    async def test_all_succeed(self):
        seen = []

        async def start(i):
            seen.append(i)

        failed = await bounded_fanout(10, start)
        assert failed == []
        assert sorted(seen) == list(range(10))

    @pytest.mark.asyncio
    async def test_below_threshold_failures_reported_not_aborted(self):
        # 5 failures out of 100 → threshold is 20, so it completes and reports them.
        async def start(i):
            if i in {3, 10, 20, 55, 99}:
                raise RuntimeError("boom")

        failed = await bounded_fanout(100, start)
        assert failed == [3, 10, 20, 55, 99]

    @pytest.mark.asyncio
    async def test_aborts_when_threshold_crossed(self):
        # Every shard fails; threshold for 100 is 20 → must abort early, not run all 100.
        attempted = []

        async def start(i):
            attempted.append(i)
            raise RuntimeError("boom")

        with pytest.raises(FanoutAborted):
            await bounded_fanout(100, start)
        # Early abort: far fewer than 100 attempted (bounded by concurrency + threshold).
        assert len(attempted) < 100

    @pytest.mark.asyncio
    async def test_concurrency_is_capped(self, monkeypatch):
        monkeypatch.setattr(shared, "FANOUT_CONCURRENCY", 3)
        current = 0
        peak = 0

        async def start(i):
            nonlocal current, peak
            current += 1
            peak = max(peak, current)
            await asyncio.sleep(0.01)
            current -= 1

        await bounded_fanout(20, start)
        assert peak <= 3
