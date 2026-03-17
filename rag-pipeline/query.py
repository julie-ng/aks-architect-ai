#!/usr/bin/env python3
"""
query.py — Search Qdrant for chunks relevant to a question.

Usage:
  uv run python query.py "How should I configure node pools for production AKS?"
  uv run python query.py "What are the network policies for AKS?" --top 10
  uv run python query.py "PCI DSS requirements" --collection aks-docs
"""

import argparse
import sys

import ollama
from qdrant_client import QdrantClient

from config import config as cfg


def main():
    parser = argparse.ArgumentParser(description="Search AKS docs in Qdrant")
    parser.add_argument("question", help="Question to search for")
    parser.add_argument("--top", type=int, default=cfg.retrieval_top_k, help="Number of results")
    parser.add_argument("--collection", default=cfg.qdrant_collection, help="Qdrant collection name")
    args = parser.parse_args()

    client = QdrantClient(url=cfg.qdrant_url)

    # Embed the question
    ollama_client = ollama.Client(host=cfg.ollama_host)
    response = ollama_client.embeddings(model=cfg.embedding_model, prompt=cfg.embedding_prefix_query + args.question)
    vector = response["embedding"]

    # Search
    response = client.query_points(
        collection_name=args.collection,
        query=vector,
        limit=args.top,
        with_payload=True,
    )
    results = response.points

    if not results:
        print("No results found.")
        sys.exit(0)

    print(f'Top {len(results)} results for: "{args.question}"\n')
    print("=" * 72)

    for i, hit in enumerate(results, 1):
        p = hit.payload
        tags = p.get("tags", {})
        print(f"\n[{i}] score={hit.score:.4f}  priority={p.get('priority', '?')}")
        print(f"    {p.get('title', '(no title)')}")
        print(f"    {p.get('url', '')}")
        if tags:
            tag_str = "  ".join(f"{k}={v}" for k, v in tags.items())
            print(f"    tags: {tag_str}")
        print()
        # Print a short preview of the chunk text
        text = p.get("text", "")
        preview = text[:300].replace("\n", " ")
        if len(text) > 300:
            preview += "..."
        print(f"    {preview}")
        print("-" * 72)


if __name__ == "__main__":
    main()
