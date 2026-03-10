"""
chunking — Pure helper functions for splitting markdown into chunks.

Used by chunk.py. Separated out for testability.
"""

import re

# Tunables
MAX_CHARS = 1500  # ~300-400 tokens — safe for nomic-embed-text (2048 token limit)
MIN_CHARS = 100   # Discard tiny fragments (e.g. heading-only sections)


def split_by_headings(markdown: str) -> list[tuple[str, str]]:
    """
    Split markdown into (heading, body) pairs at ## / ### / #### boundaries.
    Returns a list of (heading_text, section_content) tuples.
    The first tuple's heading may be empty if content precedes the first heading.
    """
    pattern = re.compile(r'^(#{2,}\s+.+)$', re.MULTILINE)
    parts = pattern.split(markdown)

    sections = []
    # parts alternates: [pre_heading_text, heading, body, heading, body, ...]
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
            current = para

    if current:
        chunks.append(current)

    return chunks


def merge_small_chunks(chunks: list[str], min_chars: int) -> list[str]:
    """Merge consecutive chunks that are smaller than min_chars."""
    merged = []
    buffer = ''
    for chunk in chunks:
        candidate = (buffer + '\n\n' + chunk).strip() if buffer else chunk
        if len(buffer) < min_chars:
            buffer = candidate
        else:
            merged.append(buffer)
            buffer = chunk
    if buffer:
        merged.append(buffer)
    return merged


def deduplicate(chunks: list[str]) -> list[str]:
    """Remove duplicate chunks, preserving order."""
    seen = set()
    result = []
    for chunk in chunks:
        if chunk not in seen:
            seen.add(chunk)
            result.append(chunk)
    return result


def sections_to_chunks(
    sections: list[tuple[str, str]],
    max_chars: int = MAX_CHARS,
    min_chars: int = MIN_CHARS,
) -> list[str]:
    """Convert heading/body sections into merged, deduped chunk texts."""
    raw = []
    for heading, body in sections:
        text = (heading + '\n\n' + body).strip() if heading else body
        if not text:
            continue
        for part in split_on_paragraphs(text, max_chars):
            if part.strip():
                raw.append(part.strip())

    merged = merge_small_chunks(raw, min_chars)
    deduped = deduplicate(merged)
    return [t for t in deduped if len(t) >= min_chars]
