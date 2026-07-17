"""Activity: bulk-load all vector shards into Postgres (single serialized writer).

This is the ONE place that must never be fanned out. It runs on the db-queue, whose
worker sets max_concurrent_activities=1, so the single-writer rule is enforced by
infrastructure. Implements the Option A fix for the t4g.micro I/O crash: TRUNCATE +
DROP the HNSW index → batched index-free INSERT → rebuild the index once at the end.

Idempotent on retry: step 1 TRUNCATEs and the vectors still live in S3, so a retry is
a clean full reload. DB_LOAD_RETRY allows exactly one retry (a repeat failure is
structural I/O saturation, not transient).
"""

import json

import psycopg
from pgvector.psycopg import register_vector
from temporalio import activity

from config import config as cfg
from helpers import storage
from helpers.db_load import CREATE_HNSW_SQL, HNSW_INDEX_NAME, INSERT_SQL
from workflows.shared import vector_shard_key


def _row(chunk: dict) -> dict:
    """Map a vector shard (chunk + embedding) to the INSERT parameter dict."""
    return {
        "id": chunk["id"],
        "text": chunk["text"],
        "url": chunk.get("url", ""),
        "title": chunk.get("title", ""),
        "description": chunk.get("description", ""),
        "source_name": chunk.get("source_name", ""),
        "priority": chunk.get("priority", 1),
        "tags": json.dumps(chunk.get("tags", {})),
        "chunk_index": chunk.get("chunk_index", 0),
        "chunk_total": chunk.get("chunk_total", 0),
        "crawled_at": chunk.get("crawled_at"),
        "embedding": chunk["embedding"],
    }


@activity.defn
def load_vectors(run_id: str, count: int) -> int:
    """Load `count` vector shards into the chunks table. Returns rows inserted.

    Option A order: TRUNCATE → DROP index → batched INSERT (index-free) → CREATE index.
    """
    conn = psycopg.connect(cfg.database_url)
    log = activity.logger
    log.info("[load_vectors] run=%s attempt=%d loading %d vectors", run_id, activity.info().attempt, count)
    try:
        register_vector(conn)

        with conn.cursor() as cur:
            cur.execute("TRUNCATE chunks")
            cur.execute(f"DROP INDEX IF EXISTS {HNSW_INDEX_NAME}")
        conn.commit()
        log.info("[load_vectors] run=%s truncated chunks + dropped HNSW for index-free load", run_id)

        inserted = 0
        batch: list[dict] = []
        for i in range(count):
            chunk = storage.read_json_single(storage.run_key(vector_shard_key(i), run_id=run_id))
            batch.append(_row(chunk))
            if len(batch) >= cfg.embedding_batch_size or i == count - 1:
                with conn.cursor() as cur:
                    cur.executemany(INSERT_SQL, batch)
                conn.commit()
                inserted += len(batch)
                log.info("[load_vectors] run=%s inserted %d/%d", run_id, inserted, count)
                batch = []

        log.info("[load_vectors] run=%s building HNSW index over %d rows", run_id, inserted)
        with conn.cursor() as cur:
            cur.execute(CREATE_HNSW_SQL)
        conn.commit()
        log.info("[load_vectors] run=%s DONE: %d vectors inserted + HNSW rebuilt", run_id, inserted)
        return inserted
    finally:
        conn.close()
