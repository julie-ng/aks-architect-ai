import ollama
from fastapi import APIRouter, Depends
from qdrant_client import QdrantClient

from app.dependencies import get_qdrant

router = APIRouter(prefix="/api")


@router.get("/health")
def health(client: QdrantClient = Depends(get_qdrant)):
    checks = {}

    try:
        client.get_collections()
        checks["qdrant"] = "ok"
    except Exception as e:
        checks["qdrant"] = f"error: {e}"

    try:
        ollama.list()
        checks["ollama"] = "ok"
    except Exception as e:
        checks["ollama"] = f"error: {e}"

    status = "healthy" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": status, "checks": checks}
