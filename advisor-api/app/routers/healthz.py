import time
import tomllib
from datetime import datetime, timezone
from pathlib import Path

import ollama
from fastapi import APIRouter, Depends
from qdrant_client import QdrantClient

from app.config import Settings
from app.dependencies import get_qdrant, get_settings

router = APIRouter()

_start_time = time.monotonic()
_pyproject = tomllib.loads(
    Path(__file__).resolve().parents[2].joinpath("pyproject.toml").read_text()
)
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
def health(
    client: QdrantClient = Depends(get_qdrant),
    settings: Settings = Depends(get_settings),
):
    checks: dict[str, dict] = {}

    try:
        collections = client.get_collections().collections
        collection_names = [c.name for c in collections]
        if settings.qdrant_collection in collection_names:
            checks["qdrant"] = {"status": "pass"}
        else:
            checks["qdrant"] = {
                "status": "fail",
                "output": f"collection '{settings.qdrant_collection}' not found",
            }
    except Exception as e:
        checks["qdrant"] = {"status": "fail", "output": str(e)}

    try:
        ollama.list()
        checks["ollama"] = {"status": "pass"}
    except Exception as e:
        checks["ollama"] = {"status": "fail", "output": str(e)}

    status = "pass" if all(c["status"] == "pass" for c in checks.values()) else "fail"
    return {
        "name": _project["name"],
        "version": _project["version"],
        "status": status,
        "env": {"APP_ENVIRONMENT": settings.app_environment},
        "uptime": _uptime(),
        "checks": checks,
    }
