#!/usr/bin/env python3
"""
embed.py — Embed chunks and upsert into Qdrant.

Reads chunks.jsonl, generates vectors via Ollama (nomic-embed-text),
and upserts them into a Qdrant collection with full metadata as payload.

Prerequisites:
  ollama pull nomic-embed-text
  docker compose -f docker-compose.dev.yaml up -d

Usage:
  uv run python embed.py
  uv run python embed.py --input chunks.jsonl --collection aks-docs
"""

import argparse
import json
import sys
from pathlib import Path

import ollama
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from config import config as cfg


def get_embedding(text: str) -> list[float]:
    client = ollama.Client(host=cfg.ollama_host)
    response = client.embeddings(model=cfg.embedding_model, prompt=cfg.embedding_prefix_document + text)
    return response["embedding"]


def recreate_collection(client: QdrantClient, name: str) -> None:
    existing = [c.name for c in client.get_collections().collections]
    if name in existing:
        client.delete_collection(collection_name=name)
        print(f"Deleted existing collection: {name}")
    client.create_collection(
        collection_name=name,
        vectors_config=VectorParams(size=cfg.embedding_vector_dim, distance=Distance.COSINE),
    )
    print(f"Created collection: {name}")


def main():
    parser = argparse.ArgumentParser(description="Embed chunks and upsert into Qdrant")
    parser.add_argument("--input", default="chunks.jsonl", help="Input JSONL file")
    parser.add_argument("--collection", default=cfg.qdrant_collection, help="Qdrant collection name")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        print("Run chunk.py first to generate chunks.jsonl", file=sys.stderr)
        sys.exit(1)

    client = QdrantClient(url=cfg.qdrant_url)
    recreate_collection(client, args.collection)

    chunks = [json.loads(line) for line in input_path.read_text().splitlines() if line.strip()]
    total = len(chunks)
    print(f'Embedding {total} chunks into "{args.collection}"...\n')

    upserted = 0
    batch: list[PointStruct] = []

    for i, chunk in enumerate(chunks, 1):
        vector = get_embedding(chunk["text"])

        # Everything except id and text goes into the payload for retrieval
        payload = {k: v for k, v in chunk.items() if k != "id"}

        batch.append(PointStruct(id=chunk["id"], vector=vector, payload=payload))

        if len(batch) >= cfg.embedding_batch_size or i == total:
            client.upsert(collection_name=args.collection, points=batch)
            upserted += len(batch)
            print(f"  [{upserted:>{len(str(total))}}/{total}] upserted")
            batch = []

    print(f'\nDone: {upserted} vectors in "{args.collection}"')


if __name__ == "__main__":
    main()
