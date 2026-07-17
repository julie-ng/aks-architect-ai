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

from temporalio.common import RetryPolicy

from config import config as cfg

# --- Task queues (split by THROTTLED RESOURCE, not by stage) -----------------
# bedrock: tag_shard + embed_shard — rate-limited under Nova/Titan TPS.
# db: load_vectors — worker runs it with max_concurrent_activities=1, so the
#     single-writer rule is enforced by infrastructure, not convention.
# default: workflow tasks + cheap/local activities (chunk, manifest).
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

# Local/deterministic activities (chunk, manifest read). A failure is
# almost always a real problem (missing artifact / dataset), not transient — so a low
# ceiling that fails loud/fast, NOT the Temporal default of unlimited retries (which
# would spin forever on a genuinely missing manifest). A couple of attempts still
# rides out a transient S3/network blip.
LOCAL_RETRY = RetryPolicy(maximum_attempts=cfg.temporal_local_max_attempts)

# --- Activity timeouts -------------------------------------------------------
BEDROCK_ACTIVITY_TIMEOUT = timedelta(seconds=60)
# The 3040-row executemany load runs ~14s/50-row batch on t4g.micro ≈ ~15 min, + the
# HNSW rebuild. The old 10-min timeout was too short and Temporal CANCELLED the activity
# mid-load at ~2200 rows → run failed. 30 min gives comfortable headroom until the load
# is sped up (COPY instead of executemany would cut this to a few min).
DB_LOAD_ACTIVITY_TIMEOUT = timedelta(minutes=30)
CHUNK_ACTIVITY_TIMEOUT = timedelta(minutes=2)

# --- Fan-out concurrency (PER-STAGE, tuned to each model's binding quota) -----
# The Semaphore is the PRIMARY throttle-avoidance knob. Tag and embed hit DIFFERENT
# Bedrock quotas (Nova 400 RPM vs Titan 300K TPM), so they get different values. Passed
# into bounded_fanout() per stage; see config.py for the quota rationale.
TAG_CONCURRENCY = cfg.temporal_tag_concurrency
EMBED_CONCURRENCY = cfg.temporal_embed_concurrency

# INFO-level progress cadence for large single-activity loops (chunk's shard writes):
# an INFO line every N completions keeps the activity visibly alive without flooding
# CloudWatch. Per-shard detail is emitted at DEBUG (opt-in via LOG_LEVEL=DEBUG).
PROGRESS_LOG_EVERY = 100


# --- Artifact key layout ------------------------------------------------------
# Per-run keys (run_key prepends the runId): chunks/tagged/vectors shards + manifest.
CHUNKS_PREFIX = "chunks"
TAGGED_PREFIX = "tagged"
VECTORS_PREFIX = "vectors"
MANIFEST_NAME = "manifest.json"

# Sources are RUN-INDEPENDENT: the crawler output is uploaded once and read by every
# run (you don't re-crawl per run), so this is a top-level prefix, NOT run-scoped. Keys
# are NOT passed through run_key. Env-configurable (SOURCES_PREFIX) so a run can target a
# sample subset (`sources-sample`) for fast iteration vs the full `sources`.
# Phase 4: the crawler Lambda writes here; for now it's a one-time `make pipeline/upload-sources`.
SOURCES_PREFIX = cfg.sources_prefix


def shard_fields(run_id: str, index: int) -> dict:
    """Structured log fields for a fan-out shard activity → the JSON `details` object.

    Pass as `logger.info("msg", extra=shard_fields(...))`. Only adds what temporalio's
    activity context does NOT already carry: the PIPELINE run_id (distinct from the
    workflow-run UUID) and the shard index. The formatter merges in temporal's
    activity_type/attempt/workflow_id automatically, so retries/misconfig stay visible.
    """
    return {"run_id": run_id, "shard": index}


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


async def bounded_fanout(count: int, start_activity, concurrency: int):
    """Run `count` shard activities with bounded concurrency + early abort.

    `start_activity(index)` must return an awaitable (a `workflow.execute_activity(...)`
    coroutine) for shard `index`. `concurrency` caps in-flight activities — the PRIMARY
    throttle-avoidance knob, tuned PER STAGE to each model's binding Bedrock quota (see
    TAG_CONCURRENCY / EMBED_CONCURRENCY). As results resolve, hard failures are counted;
    on crossing `failure_threshold(count)` the remaining in-flight activities are cancelled
    and the workflow fails immediately (don't let the rest also exhaust retries — the
    cost-blowup case). Below threshold, the stage completes and returns the failed indices.

    Returns the sorted list of failed shard indices (empty on a fully clean run).
    Raises FanoutAborted if the threshold is crossed.

    Runs under Temporal's deterministic asyncio loop, so Semaphore/gather/create_task
    are safe and replay-stable.
    """
    threshold = failure_threshold(count)
    sem = asyncio.Semaphore(concurrency)
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
