import time
import tomllib
from datetime import datetime, timezone
from pathlib import Path

import ollama
from fastapi import APIRouter, Depends
from qdrant_client import QdrantClient

from app.dependencies import get_qdrant

router = APIRouter()

_start_time = time.monotonic()
_pyproject = tomllib.loads(Path(__file__).resolve().parents[2].joinpath("pyproject.toml").read_text())
_project = _pyproject["project"]


def _uptime() -> dict:
    elapsed = time.monotonic() - _start_time
    days, remainder = divmod(int(elapsed), 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds = divmod(remainder, 60)
    return {
        "component_type": "system",
        "observed_value": elapsed,
        "human_readable": f"{days} days, {hours} hours, {minutes} minutes, {seconds} seconds",
        "observed_unit": "s",
        "status": "pass",
        "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


@router.get("/healthz")
def health(client: QdrantClient = Depends(get_qdrant)):
    checks = {}

    try:
        client.get_collections()
        checks["qdrant"] = "pass"
    except Exception as e:
        checks["qdrant"] = f"fail: {e}"

    try:
        ollama.list()
        checks["ollama"] = "pass"
    except Exception as e:
        checks["ollama"] = f"fail: {e}"

    status = "pass" if all(v == "pass" for v in checks.values()) else "fail"
    return {
        "name": _project["name"],
        "version": _project["version"],
        "status": status,
        "uptime": _uptime(),
        "checks": checks,
    }
