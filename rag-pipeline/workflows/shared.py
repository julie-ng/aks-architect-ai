"""Cross-cutting Temporal constants and helpers.

Imported by both workflow code (runs in Temporal's deterministic sandbox) and the
worker/starter. MUST stay I/O-free — no boto3/psycopg/open, no module-level side
effects — so it is safe to import inside a workflow definition. Reading the frozen
`config` object is fine (no I/O).

Tunable values (queue names, fan-out concurrency, retry ceilings) come from config
(env-overridable). The retry-policy SHAPE (exponential backoff) and the stage/queue
split are architectural and live here in code. Rationale: `docs/tasks/phase-3-temporal.md`.
"""

import asyncio
import math
from datetime import timedelta

from temporalio import activity
from temporalio.common import RetryPolicy

from config import config as cfg

# --- Task queues (split by THROTTLED RESOURCE, not by stage) -----------------
# bedrock: tag_shard + embed_shard — rate-limited under Nova/Titan TPS.
# db: load_vectors — worker runs it with max_concurrent_activities=1, so the
#     single-writer rule is enforced by infrastructure, not convention.
# default: workflow tasks + cheap/local activities (chunk, read_sources, manifest).
BEDROCK_QUEUE = cfg.temporal_bedrock_queue
DB_QUEUE = cfg.temporal_db_queue
DEFAULT_QUEUE = cfg.temporal_default_queue

# --- Retry policies (tuned to failure NATURE, per-activity) ------------------
# Bedrock calls: repeated failure is transient (throttle waves cool down) → high
# ceiling + exponential backoff (1,2,4,8,16,30,30s ≈ 90s at 8 attempts).
# ValidationException (bad/stale model id — the `eu.` inference-profile gotcha) is
# non-retryable. botocore raises ClientError for both throttling and validation, so
# the activity also inspects the AWS error *code* and re-raises ApplicationError
# non_retryable for ValidationException (see tag_shard/embed_shard).
BEDROCK_RETRY = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(seconds=30),
    maximum_attempts=cfg.temporal_bedrock_max_attempts,
)

# DB load: repeated failure is structural (I/O saturation, not transient). One retry
# is ~free (the activity TRUNCATEs and reloads from S3 → idempotent) and rescues a
# one-off blip; a second buys nothing → fail loud/fast. maximum_attempts counts the
# first attempt, so 2 = 1 retry.
DB_LOAD_RETRY = RetryPolicy(maximum_attempts=cfg.temporal_db_load_max_attempts)

# --- Activity timeouts -------------------------------------------------------
BEDROCK_ACTIVITY_TIMEOUT = timedelta(seconds=60)
DB_LOAD_ACTIVITY_TIMEOUT = timedelta(minutes=10)  # bulk load + HNSW rebuild is slow
CHUNK_ACTIVITY_TIMEOUT = timedelta(minutes=2)

# --- Fan-out concurrency -----------------------------------------------------
# Semaphore is the PRIMARY throttle-avoidance knob (keeps us under Bedrock TPS so
# retries are the exception). Tune from Temporal UI observations.
FANOUT_CONCURRENCY = cfg.temporal_fanout_concurrency


# --- Artifact key layout (relative keys; storage.run_key adds the runId) ------
CHUNKS_PREFIX = "chunks"
TAGGED_PREFIX = "tagged"
VECTORS_PREFIX = "vectors"
MANIFEST_NAME = "manifest.json"


def shard_prefix(run_id: str, index: int) -> str:
    """A consistent log prefix for a fan-out shard activity: run/shard/attempt.

    `activity.info().attempt` is 1 on the first try and climbs on retry, so a throttle
    or a misconfig (e.g. the Ollama-vs-Bedrock incident) is visible in the logs. Call
    only inside an activity.
    """
    return f"[{activity.info().activity_type}] run={run_id} shard={index} attempt={activity.info().attempt}"


def shard_name(index: int) -> str:
    """Zero-padded shard filename, e.g. 42 -> '0042.json'. 4 digits fits >3040 chunks."""
    return f"{index:04d}.json"


def chunk_shard_key(index: int) -> str:
    return f"{CHUNKS_PREFIX}/{shard_name(index)}"


def tagged_shard_key(index: int) -> str:
    return f"{TAGGED_PREFIX}/{shard_name(index)}"


def vector_shard_key(index: int) -> str:
    return f"{VECTORS_PREFIX}/{shard_name(index)}"


# --- Partial-failure early-abort threshold -----------------------------------
def failure_threshold(shard_count: int) -> int:
    """Max tolerated hard failures before a fan-out stage aborts: max(20, ceil(2%)).

    The 2% trips fast on a systemic problem (a hard failure = all attempts exhausted,
    almost always systemic); the floor of 20 stops a small re-run aborting on a couple
    of genuinely-broken chunks.
    """
    return max(20, math.ceil(shard_count * 0.02))


class FanoutAborted(Exception):
    """Raised when a fan-out stage exceeds its failure threshold and aborts early."""


async def bounded_fanout(count: int, start_activity):
    """Run `count` shard activities with bounded concurrency + early abort.

    `start_activity(index)` must return an awaitable (a `workflow.execute_activity(...)`
    coroutine) for shard `index`. Concurrency is capped at FANOUT_CONCURRENCY (the
    primary throttle-avoidance knob). As results resolve, hard failures are counted; on
    crossing `failure_threshold(count)` the remaining in-flight activities are cancelled
    and the workflow fails immediately (don't let the rest also exhaust retries — the
    cost-blowup case). Below threshold, the stage completes and returns the failed indices.

    Returns the sorted list of failed shard indices (empty on a fully clean run).
    Raises FanoutAborted if the threshold is crossed.

    Runs under Temporal's deterministic asyncio loop, so Semaphore/gather/create_task
    are safe and replay-stable.
    """
    threshold = failure_threshold(count)
    sem = asyncio.Semaphore(FANOUT_CONCURRENCY)
    failed: list[int] = []
    aborted = False

    async def run_one(index: int) -> None:
        nonlocal aborted
        async with sem:
            # Once the threshold has tripped, don't launch further activities — this is
            # what stops a full outage from burning all N shards' retries (the cost-blowup
            # case). Tasks queued behind the semaphore bail here instead of starting work.
            if aborted:
                return
            try:
                await start_activity(index)
            except Exception:
                failed.append(index)
                if len(failed) >= threshold:
                    aborted = True
                    raise FanoutAborted(
                        f"{len(failed)} shard failures ≥ threshold {threshold} of {count}"
                    )

    tasks = [asyncio.create_task(run_one(i)) for i in range(count)]
    try:
        await asyncio.gather(*tasks)
    except FanoutAborted:
        for t in tasks:
            t.cancel()
        raise

    return sorted(failed)
