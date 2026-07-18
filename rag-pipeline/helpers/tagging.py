"""
tagging — Classify a chunk against the tag taxonomy using an LLM.

`build_system_prompt` + `tag_chunk` are the entry points, used by both the old
tag.py CLI and the Temporal TaggingWorkflow's tag_shard activity. Provider is
env-selected (bedrock / anthropic / ollama); the static system block (instructions
+ vocabulary) is prompt-cached.
"""

import sys

import anthropic
import boto3
import ollama

from config import config as cfg
from helpers.tags import parse_tag_response

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


def get_cache_stats() -> dict[str, int]:
    """Accumulated Bedrock prompt-cache token counts for this process.

    Keys: `read`, `write`, `input` (uncached). A caller (e.g. the tag.py CLI's
    end-of-run report) uses read >> write to confirm the cachePoint is landing.
    Returns a copy so callers can't mutate the running totals.
    """
    return dict(_cache_stats)


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
