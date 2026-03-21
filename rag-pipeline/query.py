#!/usr/bin/env python3
"""
query.py — Search Postgres/pgvector for chunks relevant to a question.

Usage:
  uv run python query.py "How should I configure node pools for production AKS?"
  uv run python query.py "What are the network policies for AKS?" --top 10
"""

import argparse
import sys

import ollama
import psycopg
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row

from config import config as cfg

SEARCH_SQL = """
    SELECT id, text, url, title, tags, priority,
           1 - (embedding <=> %(vector)s::vector) AS score
    FROM chunks
    ORDER BY embedding <=> %(vector)s::vector
    LIMIT %(limit)s
"""


def main():
    parser = argparse.ArgumentParser(description="Search AKS docs in Postgres/pgvector")
    parser.add_argument("question", help="Question to search for")
    parser.add_argument("--top", type=int, default=cfg.retrieval_top_k, help="Number of results")
    args = parser.parse_args()

    conn = psycopg.connect(cfg.database_url, row_factory=dict_row)
    register_vector(conn)

    # Embed the question
    ollama_client = ollama.Client(host=cfg.ollama_host)
    response = ollama_client.embeddings(model=cfg.embedding_model, prompt=cfg.embedding_prefix_query + args.question)
    vector = response["embedding"]

    # Search
    with conn.cursor() as cur:
        cur.execute(SEARCH_SQL, {"vector": vector, "limit": args.top})
        results = cur.fetchall()

    conn.close()

    if not results:
        print("No results found.")
        sys.exit(0)

    print(f'Top {len(results)} results for: "{args.question}"\n')
    print("=" * 72)

    for i, row in enumerate(results, 1):
        tags = row.get("tags", {})
        print(f"\n[{i}] score={row['score']:.4f}  priority={row.get('priority', '?')}")
        print(f"    {row.get('title', '(no title)')}")
        print(f"    {row.get('url', '')}")
        if tags:
            tag_str = "  ".join(f"{k}={v}" for k, v in tags.items())
            print(f"    tags: {tag_str}")
        print()
        text = row.get("text", "")
        preview = text[:300].replace("\n", " ")
        if len(text) > 300:
            preview += "..."
        print(f"    {preview}")
        print("-" * 72)


if __name__ == "__main__":
    main()
