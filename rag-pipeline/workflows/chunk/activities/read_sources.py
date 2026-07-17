"""Activity: read the crawled source documents for a run.

Phase 3 keeps the crawler OUT of scope (repeated dev runs against the live MSFT
Learn site from a home IP risk an IP block), so sources are read from the local
Crawlee dataset directory rather than from S3. When the crawler becomes a Lambda
(phase 4) this activity switches to reading `<run_id>/sources/*.json` from S3.

Non-deterministic (filesystem I/O) → an activity, not workflow code.
"""

import json
from pathlib import Path

from temporalio import activity

# The Crawlee dataset the CLI chunk.py also reads (see chunk.py defaults).
DEFAULT_DATASET_DIR = "../web-scraper/storage/datasets/aks-docs"


@activity.defn
def read_sources(dataset_dir: str = DEFAULT_DATASET_DIR) -> list[dict]:
    """Load all crawled JSON docs from the local dataset directory."""
    dataset_path = Path(dataset_dir)
    if not dataset_path.exists():
        raise FileNotFoundError(f"dataset directory not found: {dataset_path}")

    files = sorted(dataset_path.glob("*.json"))
    if not files:
        raise FileNotFoundError(f"no JSON files found in {dataset_path}")

    docs: list[dict] = []
    for path in files:
        with path.open(encoding="utf-8") as f:
            docs.append(json.load(f))
    activity.logger.info("read %d source documents from %s", len(docs), dataset_path)
    return docs
