"""Pure helpers for parsing LLM tag responses.

The tagging LLM (Nova Micro) is asked to return a JSON array of tag strings, but
in practice it sometimes wraps the array in markdown fences or appends prose after
the closing bracket (e.g. `[] The chunk discusses ...`). These helpers extract and
parse the array defensively so a stray explanation doesn't discard a valid result.

Kept framework-free and side-effect-free so they are fully unit-testable.
"""

import json
import re

# First bracketed array in the response. Non-greedy so it stops at the first
# closing bracket; DOTALL so multi-line arrays match. Tag strings never contain
# a `]`, so the first `[...]` is the tag array.
_ARRAY_RE = re.compile(r"\[.*?\]", re.DOTALL)


def strip_code_fences(content: str) -> str:
    """Remove a surrounding ```/```json markdown fence if present.

    Returns the inner content stripped of whitespace; a fence-free string is
    returned unchanged (aside from no-op stripping).
    """
    if not content.startswith("```"):
        return content
    # Drop the opening fence line (``` or ```json), then a trailing fence if any.
    content = content.split("\n", 1)[-1]
    if content.endswith("```"):
        content = content[: content.rfind("```")]
    return content.strip()


def extract_json_array(content: str) -> str:
    """Return the first bracketed `[...]` substring, or the input unchanged.

    Isolates the JSON array from any trailing prose the model appended after the
    closing bracket. If no bracketed array is present (e.g. a truncated response
    with no closing `]`), the original content is returned so the caller's
    json.loads still fails loudly rather than silently succeeding on garbage.
    """
    match = _ARRAY_RE.search(content)
    return match.group(0) if match else content


def parse_tag_response(content: str) -> tuple[list[str], bool]:
    """Parse an LLM tag response into (tags, ok).

    Handles markdown code fences and trailing prose. `tags` is the list of string
    elements of the parsed array (possibly empty). `ok` is True when the response
    parsed as a JSON array, False when it could not be parsed (e.g. truncated
    mid-array or non-list JSON) — this lets the caller distinguish a legitimate
    empty match (`[]`, ok=True) from a parse failure worth surfacing (ok=False).
    """
    content = strip_code_fences(content.strip())
    candidate = extract_json_array(content)
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        return [], False
    if isinstance(parsed, list):
        return [t for t in parsed if isinstance(t, str)], True
    return [], False
