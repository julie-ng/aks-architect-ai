"""
Tag chunks with topic and answer labels using an LLM.

Reads chunks.jsonl, sends each chunk's text to an LLM along with the
tag vocabulary, and writes tagged_chunks.jsonl with matched tags added
to each chunk's tags field.

Usage:
    uv run python tag.py
    uv run python tag.py --input chunks.jsonl --output tagged_chunks.jsonl
"""

import argparse
import os
import sys

from config import config as cfg
from helpers import storage
from helpers.tagging import build_system_prompt, get_cache_stats, tag_chunk
from helpers.taxonomy import format_taxonomy_prompt, load_taxonomy


def main() -> None:
    parser = argparse.ArgumentParser(description="Tag chunks with topic/answer labels using an LLM")
    parser.add_argument("--input", default="chunks.jsonl", help="Input chunks key (run-scoped via storage)")
    parser.add_argument("--output", default="tagged_chunks.jsonl", help="Output key (run-scoped via storage)")
    args = parser.parse_args()

    input_key = storage.run_key(args.input)
    output_key = storage.run_key(args.output)

    if cfg.tagging_provider == "anthropic" and not os.environ.get("ANTHROPIC_API_KEY"):
        msg = "Error: ANTHROPIC_API_KEY environment variable is required when tagging_provider is 'anthropic'"
        print(msg, file=sys.stderr)
        sys.exit(1)

    # Load taxonomy from content YAML and assemble the static (cacheable) system prompt.
    taxonomy = load_taxonomy()
    taxonomy_prompt = format_taxonomy_prompt(taxonomy)
    system_prompt = build_system_prompt(taxonomy_prompt)
    valid_tags = {t["tag"] for t in taxonomy}
    print(
        f"Loaded {len(taxonomy)} tags ({len([t for t in taxonomy if t['tag'].startswith('topic:')])} topics, "
        f"{len([t for t in taxonomy if t['tag'].startswith('answer:')])} answers)\n"
    )

    # Load chunks
    try:
        chunks = list(storage.read_json_lines(input_key))
    except FileNotFoundError:
        print(f"Error: {input_key} not found", file=sys.stderr)
        sys.exit(1)
    total = len(chunks)
    print(f"Tagging {total} chunks with {cfg.tagging_model}...\n")

    tagged_count = 0
    total_tags_assigned = 0
    pad = len(str(total))

    # Tag in place, accumulate, then write once (one JSONL artifact per backend —
    # an S3 object is a single atomic put, so no incremental append).
    for i, chunk in enumerate(chunks, 1):
        assigned = tag_chunk(chunk["text"], chunk.get("title", ""), system_prompt)

        # Filter to valid tags only
        assigned = [t for t in assigned if t in valid_tags]

        # Merge with existing tags
        existing_tags = chunk.get("tags", {})
        existing_tags["taxonomy"] = assigned
        chunk["tags"] = existing_tags

        if assigned:
            tagged_count += 1
            total_tags_assigned += len(assigned)

        print(f"  [{i:>{pad}}/{total}] {len(assigned):>2} tags  {chunk.get('title', '')[:60]}")

    storage.write_json_lines(output_key, chunks)

    avg = total_tags_assigned / total if total else 0
    print(f"\nDone: {total} chunks → {tagged_count} tagged ({total_tags_assigned} total tags, avg {avg:.1f}/chunk)")
    print(f"Output: {output_key}")

    # Report prompt-cache effectiveness (bedrock only). read >> write across the run
    # confirms the system-prompt cachePoint is landing; read == 0 means the prefix
    # was below Nova's 1024-token floor and the checkpoint was silently dropped.
    if cfg.tagging_provider == "bedrock":
        stats = get_cache_stats()
        read, write, uncached = stats["read"], stats["write"], stats["input"]
        billed = read + write + uncached
        saved_pct = (read / billed * 100) if billed else 0
        print(
            f"Cache: {read:,} read + {write:,} write + {uncached:,} uncached input tokens "
            f"→ {saved_pct:.0f}% of input read from cache (billed at ~10%)"
        )
        if read == 0 and total > 1:
            print(
                "  Warning: 0 cache reads — the system prefix may be below Nova's "
                "1024-token minimum, so the cachePoint was silently ignored.",
                file=sys.stderr,
            )


if __name__ == "__main__":
    main()
