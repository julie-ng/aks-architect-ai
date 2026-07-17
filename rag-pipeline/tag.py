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

import anthropic
import boto3
import ollama

from config import config as cfg
from helpers import storage
from helpers.tags import parse_tag_response
from helpers.taxonomy import format_taxonomy_prompt, load_taxonomy

SYSTEM_PROMPT = """\
You are a document classifier for Azure Kubernetes Service (AKS) documentation.

Given a text chunk and a list of available tags, return ONLY the tags that are \
directly relevant to the chunk content. Be selective — only assign tags where \
the chunk clearly discusses that topic or answer.

Rules:
- Return a JSON array of tag strings, e.g. ["topic:networking-plugin", "answer:azure_cni_overlay"]
- Only use tags from the provided vocabulary — never invent new tags
- Each tag is an exact token: lowercase, no spaces, of the form "topic:<key>" or \
"answer:<key>". Copy the tag token EXACTLY as listed. Never append the \
human-readable label or any description to a tag — the text after the tag in the \
vocabulary is a hint for you, not part of the tag.
- A chunk may match zero tags (return []) if none are relevant
- Prefer specific answer tags over broad topic tags when the chunk discusses a specific option
- Always include the parent topic tag when assigning an answer tag
- Assign AT MOST ONE answer per topic — the answers under a topic are mutually \
exclusive options, so never list two answers from the same topic
- Return ONLY the JSON array. Output nothing before the opening [ and nothing \
after the closing ] — no prose, no explanation, no restating the chunk"""

# Max output tokens for a tag response. Tags are short, but the full valid list
# (parent topic + answer across several topics) can run long; 256 truncated some
# arrays mid-token → invalid JSON → 0 tags. 512 fits the longest valid list with
# margin. Shared across providers so behaviour is identical.
_MAX_OUTPUT_TOKENS = 512


def _call_ollama(system: str, user: str, model: str) -> str:
    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        options={"temperature": 0.1},
    )
    return response["message"]["content"].strip()


def _call_anthropic(system: str, user: str, model: str) -> str:
    client = anthropic.Anthropic()
    response = client.messages.create(
        model=model,
        max_tokens=_MAX_OUTPUT_TOKENS,
        temperature=0.1,
        # Cache the static system block (classifier instructions + tag vocabulary).
        # Anthropic requires an explicit cache_control breakpoint; Bedrock uses cachePoint.
        system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user}],
    )
    block = response.content[0]
    if not isinstance(block, anthropic.types.TextBlock):
        raise TypeError(f"Expected a text block from Anthropic, got {type(block).__name__}")
    return block.text.strip()


# One module-level client, created lazily so ollama-only runs don't need AWS creds.
_bedrock_client = None

# Accumulated cache metrics across a tagging run — proves the cache is landing
# (a checkpoint below Nova's 1024-token floor is silently dropped, not an error).
_cache_stats = {"read": 0, "write": 0, "input": 0}


def _call_bedrock(system: str, user: str, model: str) -> str:
    """Tag via Bedrock (Nova Micro) using the Converse API with prompt caching.

    The static system block (classifier instructions + tag vocabulary) is cached
    via a `cachePoint` so it is not re-billed/re-processed on every chunk. Nova's
    minimum cacheable prefix is 1024 tokens; below that the checkpoint is silently
    ignored. Credentials come from the standard AWS chain (locally
    AWS_PROFILE=process; on Lambda the execution role); region from config.
    """
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client("bedrock-runtime", region_name=cfg.aws_region)

    response = _bedrock_client.converse(
        modelId=model,
        # cachePoint after the system text → everything before it is the cache prefix.
        system=[{"text": system}, {"cachePoint": {"type": "default"}}],
        messages=[{"role": "user", "content": [{"text": user}]}],
        inferenceConfig={"maxTokens": _MAX_OUTPUT_TOKENS, "temperature": 0.1},
    )

    usage = response.get("usage", {})
    _cache_stats["read"] += usage.get("cacheReadInputTokens", 0)
    _cache_stats["write"] += usage.get("cacheWriteInputTokens", 0)
    _cache_stats["input"] += usage.get("inputTokens", 0)

    return response["output"]["message"]["content"][0]["text"].strip()


def build_system_prompt(taxonomy_prompt: str) -> str:
    """Assemble the static system prompt: classifier instructions + tag vocabulary.

    This is identical for every chunk in a run, so it is the natural cache prefix
    (see _call_bedrock's cachePoint). Only the per-chunk title/text goes in the
    user message.
    """
    return f"""{SYSTEM_PROMPT}

## Available Tags

{taxonomy_prompt}"""


def tag_chunk(text: str, title: str, system_prompt: str) -> list[str]:
    """Send a chunk to the LLM and parse the returned tags.

    `system_prompt` is the pre-assembled static prompt from build_system_prompt()
    (instructions + vocabulary); only the chunk itself varies per call.
    """
    user_prompt = f"""## Chunk to classify

Title: {title}

{text}

Return ONLY a JSON array of matching tags:"""

    if cfg.tagging_provider == "bedrock":
        content = _call_bedrock(system_prompt, user_prompt, cfg.tagging_model)
    elif cfg.tagging_provider == "anthropic":
        content = _call_anthropic(system_prompt, user_prompt, cfg.tagging_model)
    else:
        content = _call_ollama(system_prompt, user_prompt, cfg.tagging_model)

    tags, ok = parse_tag_response(content)
    if not ok:
        print(f"  Warning: could not parse LLM response: {content[:80]}", file=sys.stderr)
    return tags


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
        read, write, uncached = _cache_stats["read"], _cache_stats["write"], _cache_stats["input"]
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
