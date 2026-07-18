"""Activity: bulk-load all vector shards into Postgres (single serialized writer).

This is the ONE place that must never be fanned out. It runs on the db-queue, whose
worker sets max_concurrent_activities=1, so the single-writer rule is enforced by
infrastructure. Implements the Option A fix for the t4g.micro I/O crash: TRUNCATE +
DROP the HNSW index → index-free bulk COPY → rebuild the index once at the end.

Idempotent on retry: step 1 TRUNCATEs and the vectors still live in S3, so a retry is
a clean full reload. DB_LOAD_RETRY allows exactly one retry (a repeat failure is
structural I/O saturation, not transient).
"""

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

        # One streaming COPY = one transaction: read each shard from S3 and write it to
        # the COPY stream as we go (no all-in-memory list of 1024-float vectors). TRUNCATE
        # already made the load all-or-nothing, so a single commit at the end (vs the old
        # per-batch commits) is the right idiom — a mid-load failure just retries clean.
        inserted = 0
        with conn.cursor() as cur, cur.copy(COPY_SQL) as copy:
            copy.set_types(COPY_TYPES)
            for i in range(count):
                chunk = storage.read_json_single(storage.run_key(vector_shard_key(i), run_id=run_id))
                copy.write_row(_row(chunk))
                inserted += 1
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
