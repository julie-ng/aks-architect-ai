"""
chunking — Pure helper functions for splitting markdown into chunks.

Used by chunk.py. Separated out for testability.
"""

import re

from config import config as cfg


def split_by_headings(markdown: str) -> list[tuple[str, str]]:
    """
    Split markdown into (heading, body) pairs at ## / ### / #### boundaries.
    Returns a list of (heading_text, section_content) tuples.
    The first tuple's heading may be empty if content precedes the first heading.
    """
    pattern = re.compile(r"^(#{2,}\s+.+)$", re.MULTILINE)
    parts = pattern.split(markdown)

    sections = []
    # parts alternates: [pre_heading_text, heading, body, heading, body, ...]
    if parts[0].strip():
        sections.append(("", parts[0].strip()))

    for i in range(1, len(parts), 2):
        heading = parts[i].strip()
        body = parts[i + 1].strip() if i + 1 < len(parts) else ""
        sections.append((heading, body))

    return sections


def hard_split(text: str, max_chars: int) -> list[str]:
    """Split text that has no paragraph breaks into chunks at line boundaries."""
    lines = text.split("\n")
    chunks = []
    current = ""

    for line in lines:
        candidate = (current + "\n" + line) if current else line
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current)
            # If a single line exceeds max_chars, include it as its own chunk
            current = line

    if current:
        chunks.append(current)

    return chunks


def split_on_paragraphs(text: str, max_chars: int) -> list[str]:
    """Further split a long block on blank lines to stay under max_chars."""
    if len(text) <= max_chars:
        return [text]

    paragraphs = re.split(r"\n{2,}", text)
    chunks = []
    current = ""

    for para in paragraphs:
        if not para.strip():
            continue
        # If a single paragraph exceeds max_chars, hard-split it on line breaks
        if len(para) > max_chars:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(hard_split(para, max_chars))
            continue
        candidate = (current + "\n\n" + para).strip() if current else para
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = para

    if current:
        chunks.append(current)

    return chunks


def merge_small_chunks(chunks: list[str], min_chars: int, max_chars: int) -> list[str]:
    """Merge consecutive chunks that are smaller than min_chars, without exceeding max_chars."""
    merged = []
    buffer = ""
    for chunk in chunks:
        candidate = (buffer + "\n\n" + chunk).strip() if buffer else chunk
        if len(buffer) < min_chars and len(candidate) <= max_chars:
            buffer = candidate
        else:
            if buffer:
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
    max_chars: int = cfg.chunk_max_chars,
    min_chars: int = cfg.chunk_min_chars,
) -> list[str]:
    """Convert heading/body sections into merged, deduped chunk texts."""
    raw = []
    for heading, body in sections:
        text = (heading + "\n\n" + body).strip() if heading else body
        if not text:
            continue
        for part in split_on_paragraphs(text, max_chars):
            if part.strip():
                raw.append(part.strip())

    merged = merge_small_chunks(raw, min_chars, max_chars)
    deduped = deduplicate(merged)
    return [t for t in deduped if len(t) >= min_chars]
