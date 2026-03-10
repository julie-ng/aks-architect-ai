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
import uuid
from pathlib import Path

from helpers.chunking import MAX_CHARS, MIN_CHARS, sections_to_chunks, split_by_headings


def chunk_document(doc: dict) -> list[dict]:
    """Split a crawled page into chunks, each inheriting page metadata."""
    markdown = doc.get('markdown', '').strip()
    if not markdown:
        return []

    sections = split_by_headings(markdown)
    chunk_texts = sections_to_chunks(sections, MAX_CHARS, MIN_CHARS)

    results = []
    for i, text in enumerate(chunk_texts):
        results.append({
            'id': str(uuid.uuid4()),
            'text': text,
            'url': doc.get('url', ''),
            'title': doc.get('title', ''),
            'description': doc.get('description', ''),
            'source_name': doc.get('source_name', ''),
            'priority': doc.get('priority', 0),
            'tags': doc.get('tags', {}),
            'chunk_index': i,
            'chunk_total': len(chunk_texts),
            'crawled_at': doc.get('crawled_at', ''),
        })

    return results


def main():
    parser = argparse.ArgumentParser(description='Chunk crawled docs into JSONL for embedding')
    parser.add_argument(
        '--dataset',
        default='../web-scraper/storage/datasets/aks-docs',
        help='Path to the Crawlee dataset directory',
    )
    parser.add_argument(
        '--output',
        default='chunks.jsonl',
        help='Output JSONL file path',
    )
    args = parser.parse_args()

    dataset_path = Path(args.dataset)
    if not dataset_path.exists():
        print(f'Error: dataset directory not found: {dataset_path}', file=sys.stderr)
        sys.exit(1)

    input_files = sorted(dataset_path.glob('*.json'))
    if not input_files:
        print(f'Error: no JSON files found in {dataset_path}', file=sys.stderr)
        sys.exit(1)

    output_path = Path(args.output)
    total_docs = 0
    total_chunks = 0

    with output_path.open('w', encoding='utf-8') as out:
        for path in input_files:
            with path.open(encoding='utf-8') as f:
                doc = json.load(f)

            chunks = chunk_document(doc)
            for chunk in chunks:
                out.write(json.dumps(chunk, ensure_ascii=False) + '\n')

            total_docs += 1
            total_chunks += len(chunks)
            print(f'  [{total_docs:>3}] {len(chunks):>3} chunks  {doc.get("title", path.name)[:70]}')

    print(f'\nDone: {total_docs} docs → {total_chunks} chunks → {output_path}')


if __name__ == '__main__':
    main()
