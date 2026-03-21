#!/usr/bin/env python3
"""
embed.py — Embed chunks and insert into Postgres/pgvector.

Reads chunks.jsonl, generates vectors via Ollama (nomic-embed-text),
and inserts them into the chunks table with full metadata.

Prerequisites:
  ollama pull nomic-embed-text
  docker compose -f docker-compose.dev.yaml up -d

Usage:
  uv run python embed.py
  uv run python embed.py --input chunks.jsonl
"""

import argparse
import json
import sys
from pathlib import Path

import ollama
import psycopg
from pgvector.psycopg import register_vector

from config import config as cfg

INSERT_SQL = """
    INSERT INTO chunks
        (id, text, url, title, description, source_name,
         priority, tags, chunk_index, chunk_total, crawled_at, embedding)
    VALUES
        (%(id)s, %(text)s, %(url)s, %(title)s, %(description)s, %(source_name)s,
         %(priority)s, %(tags)s, %(chunk_index)s, %(chunk_total)s, %(crawled_at)s, %(embedding)s)
"""


def get_embedding(text: str) -> list[float]:
    client = ollama.Client(host=cfg.ollama_host)
    response = client.embeddings(model=cfg.embedding_model, prompt=cfg.embedding_prefix_document + text)
    return response["embedding"]


def main():
    parser = argparse.ArgumentParser(description="Embed chunks and insert into Postgres/pgvector")
    parser.add_argument("--input", default="chunks.jsonl", help="Input JSONL file")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        print("Run chunk.py first to generate chunks.jsonl", file=sys.stderr)
        sys.exit(1)

    conn = psycopg.connect(cfg.database_url)
    register_vector(conn)

    # Clear existing chunks (equivalent to Qdrant collection recreation)
    with conn.cursor() as cur:
        cur.execute("TRUNCATE chunks")
    conn.commit()
    print("Cleared chunks table")

    chunks = [json.loads(line) for line in input_path.read_text().splitlines() if line.strip()]
    total = len(chunks)
    print(f"Embedding {total} chunks...\n")

    inserted = 0
    batch: list[dict] = []

    for i, chunk in enumerate(chunks, 1):
        vector = get_embedding(chunk["text"])

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

    conn.close()
    print(f"\nDone: {inserted} vectors inserted")


if __name__ == "__main__":
    main()
