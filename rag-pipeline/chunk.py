#!/usr/bin/env python3
"""
chunk.py — Read crawled JSON docs, split markdown into chunks, output JSONL.

Input:  ../web-scraper/storage/datasets/aks-docs/*.json
Output: chunks.jsonl (one chunk per line, ready for embedding)

Chunking strategy:
  - Split on markdown headings (##, ###, ####)
  - Each chunk keeps its heading as context
  - Chunks larger than MAX_CHARS are further split on paragraph breaks
  - Chunks smaller than MIN_CHARS are merged with the next chunk

Usage:
  python chunk.py
  python chunk.py --dataset ../web-scraper/storage/datasets/aks-docs
  python chunk.py --output chunks.jsonl
"""

import argparse
import json
import sys
from pathlib import Path

from helpers import storage
from helpers.chunking import chunk_document


def main():
    parser = argparse.ArgumentParser(description="Chunk crawled docs into JSONL for embedding")
    parser.add_argument(
        "--dataset",
        default="../web-scraper/storage/datasets/aks-docs",
        help="Path to the Crawlee dataset directory",
    )
    parser.add_argument(
        "--output",
        default="chunks.jsonl",
        help="Output JSONL key (run-scoped via storage backend)",
    )
    args = parser.parse_args()

    # The crawler dataset is the crawler's local output, outside the storage
    # abstraction (crawler→S3 is a later phase); read it directly from disk.
    dataset_path = Path(args.dataset)
    if not dataset_path.exists():
        print(f"Error: dataset directory not found: {dataset_path}", file=sys.stderr)
        sys.exit(1)

    input_files = sorted(dataset_path.glob("*.json"))
    if not input_files:
        print(f"Error: no JSON files found in {dataset_path}", file=sys.stderr)
        sys.exit(1)

    output_key = storage.run_key(args.output)
    total_docs = 0
    all_chunks: list[dict] = []

    for path in input_files:
        with path.open(encoding="utf-8") as f:
            doc = json.load(f)

        chunks = chunk_document(doc)
        all_chunks.extend(chunks)

        total_docs += 1
        print(f"  [{total_docs:>3}] {len(chunks):>3} chunks  {doc.get('title', path.name)[:70]}")

    # Chunk output is small (~1.7MB); write it as one JSONL artifact through the
    # storage backend (local file or S3 object).
    storage.write_json_lines(output_key, all_chunks)
    print(f"\nDone: {total_docs} docs → {len(all_chunks)} chunks → {output_key}")


if __name__ == "__main__":
    main()
