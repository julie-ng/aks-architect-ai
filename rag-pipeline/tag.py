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
import json
import sys
from pathlib import Path

import ollama

from config import config as cfg
from helpers.taxonomy import format_taxonomy_prompt, load_taxonomy

SYSTEM_PROMPT = """\
You are a document classifier for Azure Kubernetes Service (AKS) documentation.

Given a text chunk and a list of available tags, return ONLY the tags that are \
directly relevant to the chunk content. Be selective — only assign tags where \
the chunk clearly discusses that topic or answer.

Rules:
- Return a JSON array of tag strings, e.g. ["topic:networking-plugin", "answer:azure_cni_overlay"]
- Only use tags from the provided vocabulary — never invent new tags
- A chunk may match zero tags (return []) if none are relevant
- Prefer specific answer tags over broad topic tags when the chunk discusses a specific option
- Always include the parent topic tag when assigning an answer tag
- Return ONLY the JSON array, no explanation"""


def tag_chunk(text: str, title: str, taxonomy_prompt: str) -> list[str]:
    """Send a chunk to the LLM and parse the returned tags."""
    user_prompt = f"""## Available Tags

{taxonomy_prompt}

## Chunk to classify

Title: {title}

{text}

Return ONLY a JSON array of matching tags:"""

    response = ollama.chat(
        model=cfg.tagging_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        options={"temperature": 0.1},
    )

    content = response["message"]["content"].strip()

    # Strip markdown code fences if present
    if content.startswith("```"):
        content = content.split("\n", 1)[-1]
        if content.endswith("```"):
            content = content[: content.rfind("```")]
        content = content.strip()

    try:
        tags = json.loads(content)
        if isinstance(tags, list):
            return [t for t in tags if isinstance(t, str)]
    except json.JSONDecodeError:
        print(f"  Warning: could not parse LLM response: {content[:80]}", file=sys.stderr)

    return []


def main() -> None:
    parser = argparse.ArgumentParser(description="Tag chunks with topic/answer labels using an LLM")
    parser.add_argument("--input", default="chunks.jsonl", help="Input chunks file (default: chunks.jsonl)")
    parser.add_argument("--output", default="tagged_chunks.jsonl", help="Output file (default: tagged_chunks.jsonl)")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: {input_path} not found", file=sys.stderr)
        sys.exit(1)

    # Load taxonomy from content YAML
    taxonomy = load_taxonomy()
    taxonomy_prompt = format_taxonomy_prompt(taxonomy)
    valid_tags = {t["tag"] for t in taxonomy}
    print(
        f"Loaded {len(taxonomy)} tags ({len([t for t in taxonomy if t['tag'].startswith('topic:')])} topics, "
        f"{len([t for t in taxonomy if t['tag'].startswith('answer:')])} answers)\n"
    )

    # Load chunks
    chunks = [json.loads(line) for line in input_path.read_text().splitlines() if line.strip()]
    total = len(chunks)
    print(f"Tagging {total} chunks with {cfg.tagging_model}...\n")

    tagged_count = 0
    total_tags_assigned = 0
    pad = len(str(total))

    with output_path.open("w", encoding="utf-8") as out:
        for i, chunk in enumerate(chunks, 1):
            assigned = tag_chunk(chunk["text"], chunk.get("title", ""), taxonomy_prompt)

            # Filter to valid tags only
            assigned = [t for t in assigned if t in valid_tags]

            # Merge with existing tags
            existing_tags = chunk.get("tags", {})
            existing_tags["taxonomy"] = assigned
            chunk["tags"] = existing_tags

            out.write(json.dumps(chunk, ensure_ascii=False) + "\n")

            if assigned:
                tagged_count += 1
                total_tags_assigned += len(assigned)

            print(f"  [{i:>{pad}}/{total}] {len(assigned):>2} tags  {chunk.get('title', '')[:60]}")

    avg = total_tags_assigned / total if total else 0
    print(f"\nDone: {total} chunks → {tagged_count} tagged ({total_tags_assigned} total tags, avg {avg:.1f}/chunk)")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()
