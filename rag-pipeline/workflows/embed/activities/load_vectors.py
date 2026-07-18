"""Activity: bulk-load all vector shards into Postgres (single serialized writer).

This is the ONE place that must never be fanned out. It runs on the db-queue, whose
worker sets max_concurrent_activities=1, so the single-writer rule is enforced by
infrastructure. Implements the Option A fix for the t4g.micro I/O crash: TRUNCATE +
DROP the HNSW index → index-free bulk COPY → rebuild the index once at the end.

Idempotent on retry: step 1 TRUNCATEs and the vectors still live in S3, so a retry is
a clean full reload. DB_LOAD_RETRY allows exactly one retry (a repeat failure is
structural I/O saturation, not transient).
"""

import concurrent.futures
from collections import deque
from datetime import datetime
from uuid import UUID

import psycopg
from pgvector.psycopg import register_vector
from psycopg.types.json import Jsonb
from temporalio import activity

from config import config as cfg
from helpers import storage
from helpers.db_load import COPY_SQL, COPY_TYPES, CREATE_HNSW_SQL, HNSW_INDEX_NAME
from workflows.shared import PROGRESS_LOG_EVERY, vector_shard_key

# After COPY made the DB write instant, the load is gated by SEQUENTIAL S3 reads (one GET
# per shard). A thread pool reads shards ahead of the single COPY writer; only the reads
# parallelize — copy.write_row stays on the main thread (COPY is one non-thread-safe
# stream). Mirrors chunk_documents._S3_IO_CONCURRENCY.
_S3_READ_CONCURRENCY = 20

# Bounded read-ahead window: at most this many shards are in flight/buffered at once, so
# the reader can't outrun the writer and materialize all N vectors in RAM (~3040 × 1024
# float32 ≈ hundreds of MB). This bounds WORKER-PROCESS memory — a separate concern from
# the db-queue single-writer rule, which bounds POSTGRES write concurrency, not memory.
# It also future-proofs for Lambda, where per-invocation memory is a hard ceiling.
_READ_AHEAD_WINDOW = 128


def _read_shard(run_id: str, index: int) -> dict:
    """Read one vector shard from S3 (the parallelizable, latency-bound step)."""
    return storage.read_json_single(storage.run_key(vector_shard_key(index), run_id=run_id))


def _parse_crawled_at(value) -> datetime | None:
    """ISO-8601 string → datetime for the timestamptz column (NULL if empty/missing).

    Binary COPY won't cast a str into timestamptz (unlike the INSERT path, which let
    Postgres coerce it), so the value must arrive as a real datetime.
    """
    if not value:
        return None
    return datetime.fromisoformat(value)


def _row(chunk: dict) -> tuple:
    """Map a vector shard (chunk + embedding) to a COPY row tuple, in COLUMNS order.

    Binary COPY applies no cast, so values must arrive as their exact Python types:
    id → UUID, crawled_at → datetime, tags → Jsonb (dumped as jsonb, not text);
    embedding is a list handled by pgvector's registered dumper.
    """
    return (
        UUID(chunk["id"]),
        chunk["text"],
        chunk.get("url", ""),
        chunk.get("title", ""),
        chunk.get("description", ""),
        chunk.get("source_name", ""),
        chunk.get("priority", 1),
        Jsonb(chunk.get("tags", {})),
        chunk.get("chunk_index", 0),
        chunk.get("chunk_total", 0),
        _parse_crawled_at(chunk.get("crawled_at")),
        chunk["embedding"],
    )


@activity.defn
def load_vectors(run_id: str, count: int) -> int:
    """Load `count` vector shards into the chunks table. Returns rows inserted.

    Option A order: TRUNCATE → DROP index → bulk COPY (index-free) → CREATE index.
    """
    conn = psycopg.connect(cfg.database_url)
    log = activity.logger
    # temporalio's context supplies activity_type + attempt; we add the pipeline run_id.
    fields = {"run_id": run_id}
    log.info("load starting", extra={**fields, "count": count})
    try:
        register_vector(conn)

        with conn.cursor() as cur:
            cur.execute("TRUNCATE chunks")
            cur.execute(f"DROP INDEX IF EXISTS {HNSW_INDEX_NAME}")
        conn.commit()
        log.info("truncated chunks + dropped HNSW for index-free load", extra=fields)

        # One streaming COPY = one transaction, fed by a bounded read-ahead window: a thread
        # pool reads shards from S3 in parallel (the latency-bound step), while the single
        # main thread drains them IN ORDER into the COPY stream. The deque of futures caps
        # in-flight reads at _READ_AHEAD_WINDOW so the reader can't buffer all N vectors in
        # RAM — true backpressure (ThreadPoolExecutor.map would pre-submit all N and buffer
        # completed results with no bound). TRUNCATE already made the load all-or-nothing, so
        # a single commit at the end is the right idiom — a mid-load failure just retries clean.
        inserted = 0
        with (
            concurrent.futures.ThreadPoolExecutor(max_workers=_S3_READ_CONCURRENCY) as pool,
            conn.cursor() as cur,
            cur.copy(COPY_SQL) as copy,
        ):
            copy.set_types(COPY_TYPES)
            # Prime the window, then refill one read per row written (keeps ≤ window in flight).
            window = min(_READ_AHEAD_WINDOW, count)
            futures: deque = deque(pool.submit(_read_shard, run_id, i) for i in range(window))
            next_to_submit = window
            while futures:
                chunk = futures.popleft().result()  # in-order; blocks until this shard is read
                copy.write_row(_row(chunk))
                inserted += 1
                if next_to_submit < count:
                    futures.append(pool.submit(_read_shard, run_id, next_to_submit))
                    next_to_submit += 1
                if inserted % PROGRESS_LOG_EVERY == 0 or inserted == count:
                    log.info("copied rows", extra={**fields, "inserted": inserted, "count": count})
        conn.commit()

        log.info("building HNSW index", extra={**fields, "rows": inserted})
        with conn.cursor() as cur:
            cur.execute(CREATE_HNSW_SQL)
        conn.commit()
        log.info("load done: vectors inserted + HNSW rebuilt", extra={**fields, "inserted": inserted})
        return inserted
    finally:
        conn.close()
