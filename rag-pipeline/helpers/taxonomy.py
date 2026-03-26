"""
Load tag vocabulary from advisor-ui content YAML frontmatter.

Extracts topic and answer tags from requirements and decisions
markdown files, producing a flat list suitable for LLM-based
chunk classification.
"""

from pathlib import Path

import yaml

CONTENT_ROOT = Path(__file__).resolve().parent.parent.parent / "advisor-ui" / "content" / "aks"


def _parse_frontmatter(path: Path) -> dict | None:
    """Extract YAML frontmatter from a markdown file."""
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return None
    end = text.index("---", 3)
    return yaml.safe_load(text[3:end])


def _extract_tags(directory: Path, collection: str) -> list[dict]:
    """Extract topic and answer tags from all .md files in a directory."""
    tags: list[dict] = []
    for path in sorted(directory.glob("*.md")):
        fm = _parse_frontmatter(path)
        if not fm or "spec" not in fm:
            continue

        spec = fm["spec"]
        # Strip numeric prefix: "3.networking-plugin.md" → "networking-plugin"
        question_key = path.stem.split(".", 1)[-1] if "." in path.stem else path.stem

        tags.append(
            {
                "tag": f"topic:{question_key}",
                "label": spec.get("title", question_key),
                "collection": collection,
            }
        )

        for answer in spec.get("answers", []):
            if answer.get("disabled"):
                continue
            tags.append(
                {
                    "tag": f"answer:{answer['key']}",
                    "label": answer.get("label", answer["key"]),
                    "collection": collection,
                    "topic": question_key,
                }
            )

    return tags


def load_taxonomy() -> list[dict]:
    """Load the full tag vocabulary from requirements and decisions content."""
    requirements_dir = CONTENT_ROOT / "requirements"
    decisions_dir = CONTENT_ROOT / "decisions"

    tags: list[dict] = []
    if requirements_dir.exists():
        tags.extend(_extract_tags(requirements_dir, "requirements"))
    if decisions_dir.exists():
        tags.extend(_extract_tags(decisions_dir, "decisions"))

    return tags


def format_taxonomy_prompt(taxonomy: list[dict]) -> str:
    """Format taxonomy as a concise reference for the LLM prompt."""
    lines: list[str] = []
    for t in taxonomy:
        topic = f" (under {t['topic']})" if "topic" in t else ""
        lines.append(f"- {t['tag']}: {t['label']}{topic}")
    return "\n".join(lines)
