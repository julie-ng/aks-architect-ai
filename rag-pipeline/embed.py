#!/usr/bin/env python3
"""
embed.py — Embed chunks and insert into Postgres/pgvector.

Reads tagged_chunks.jsonl, generates vectors via AWS Bedrock Titan
(amazon.titan-embed-text-v2:0), and inserts them into the chunks table with
full metadata.

Prerequisites:
  AWS credentials (locally: AWS_PROFILE=process; on Lambda: execution role)
  docker compose -f docker-compose.dev.yaml up -d

Usage:
  AWS_PROFILE=process uv run python embed.py
  AWS_PROFILE=process uv run python embed.py --input tagged_chunks.jsonl
"""

import argparse
import json
import sys
from pathlib import Path

import psycopg
from pgvector.psycopg import register_vector

from config import config as cfg
from helpers.embedding import embed_text

INSERT_SQL = """
    INSERT INTO chunks
        (id, text, url, title, description, source_name,
         priority, tags, chunk_index, chunk_total, crawled_at, embedding)
    VALUES
        (%(id)s, %(text)s, %(url)s, %(title)s, %(description)s, %(source_name)s,
         %(priority)s, %(tags)s, %(chunk_index)s, %(chunk_total)s, %(crawled_at)s, %(embedding)s)
"""

# HNSW index maintenance on every INSERT is I/O-heavy — on a small instance it
# saturates disk and stalls the connection. So we DROP the index before the bulk
# load and rebuild it once afterwards (far cheaper than 3040 incremental updates).
# Must stay in sync with db/init.sql.
HNSW_INDEX_NAME = "chunks_embedding_idx"
CREATE_HNSW_SQL = f"""
    CREATE INDEX IF NOT EXISTS {HNSW_INDEX_NAME}
        ON chunks USING hnsw (embedding vector_cosine_ops)
"""


def main():
    parser = argparse.ArgumentParser(description="Embed chunks and insert into Postgres/pgvector")
    parser.add_argument("--input", default="tagged_chunks.jsonl", help="Input JSONL file")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        print("Run chunk.py → tag.py first to generate tagged_chunks.jsonl", file=sys.stderr)
        sys.exit(1)

    conn = psycopg.connect(cfg.database_url)
    register_vector(conn)

    # Clear existing chunks and DROP the HNSW index so the bulk load is index-free
    # (rebuilt once at the end). Prevents per-insert index maintenance from
    # saturating disk I/O and dropping the connection mid-load.
    with conn.cursor() as cur:
        cur.execute("TRUNCATE chunks")
        cur.execute(f"DROP INDEX IF EXISTS {HNSW_INDEX_NAME}")
    conn.commit()
    print("Cleared chunks table and dropped HNSW index for bulk load")

    chunks = [json.loads(line) for line in input_path.read_text().splitlines() if line.strip()]
    total = len(chunks)
    print(f"Embedding {total} chunks...\n")

    inserted = 0
    batch: list[dict] = []

    for i, chunk in enumerate(chunks, 1):
        vector = embed_text(chunk["text"])

        batch.append(
            {
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
                "embedding": vector,
            }
        )

        if len(batch) >= cfg.embedding_batch_size or i == total:
            with conn.cursor() as cur:
                cur.executemany(INSERT_SQL, batch)
            conn.commit()
            inserted += len(batch)
            print(f"  [{inserted:>{len(str(total))}}/{total}] inserted")
            batch = []

    # Rebuild the HNSW index once over the fully-loaded table.
    print(f"\n{inserted} vectors inserted. Building HNSW index (this can take a bit)...")
    with conn.cursor() as cur:
        cur.execute(CREATE_HNSW_SQL)
    conn.commit()

    conn.close()
    print("Done: vectors inserted and HNSW index rebuilt")


if __name__ == "__main__":
    main()
