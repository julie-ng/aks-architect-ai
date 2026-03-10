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
import re
import sys
import uuid
from pathlib import Path

# Tunables
MAX_CHARS = 1500  # ~300-400 tokens — safe for nomic-embed-text (2048 token limit)
MIN_CHARS = 100   # Discard tiny fragments (e.g. heading-only sections)


def split_by_headings(markdown: str) -> list[tuple[str, str]]:
    """
    Split markdown into (heading, body) pairs at ## / ### / #### boundaries.
    Returns a list of (heading_text, section_content) tuples.
    The first tuple's heading may be empty if content precedes the first heading.
    """
    # Match ##+ headings (but not # which is the page title)
    pattern = re.compile(r'^(#{2,}\s+.+)$', re.MULTILINE)
    parts = pattern.split(markdown)

    sections = []
    # parts alternates: [pre_heading_text, heading, body, heading, body, ...]
    # First element is text before any heading
    if parts[0].strip():
        sections.append(('', parts[0].strip()))

    for i in range(1, len(parts), 2):
        heading = parts[i].strip()
        body = parts[i + 1].strip() if i + 1 < len(parts) else ''
        sections.append((heading, body))

    return sections


def split_on_paragraphs(text: str, max_chars: int) -> list[str]:
    """Further split a long block on blank lines to stay under max_chars."""
    if len(text) <= max_chars:
        return [text]

    paragraphs = re.split(r'\n{2,}', text)
    chunks = []
    current = ''

    for para in paragraphs:
        if not para.strip():
            continue
        candidate = (current + '\n\n' + para).strip() if current else para
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current)
            # If a single paragraph exceeds max, include it anyway (hard to split further)
            current = para

    if current:
        chunks.append(current)

    return chunks


def chunk_document(doc: dict) -> list[dict]:
    """Split a crawled page into chunks, each inheriting page metadata."""
    markdown = doc.get('markdown', '').strip()
    if not markdown:
        return []

    sections = split_by_headings(markdown)
    raw_chunks = []

    for heading, body in sections:
        text = (heading + '\n\n' + body).strip() if heading else body
        if not text:
            continue
        # Split oversized sections further
        for part in split_on_paragraphs(text, MAX_CHARS):
            if part.strip():
                raw_chunks.append(part.strip())

    # Merge consecutive tiny chunks
    merged = []
    buffer = ''
    for chunk in raw_chunks:
        candidate = (buffer + '\n\n' + chunk).strip() if buffer else chunk
        if len(buffer) < MIN_CHARS:
            buffer = candidate
        else:
            merged.append(buffer)
            buffer = chunk
    if buffer:
        merged.append(buffer)

    # Deduplicate — some pages have repeated div.content blocks
    seen = set()
    deduped = []
    for chunk in merged:
        if chunk not in seen:
            seen.add(chunk)
            deduped.append(chunk)
    merged = deduped

    # Build output records
    results = []
    for i, text in enumerate(merged):
        if len(text) < MIN_CHARS:
            continue
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
            'chunk_total': len(merged),
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
