from fastapi import APIRouter, Depends
from qdrant_client import QdrantClient

from app.config import Settings
from app.dependencies import get_qdrant, get_settings
from app.models import RetrieveChunk, RetrieveRequest, RetrieveResponse
from app.services.reformulation import reformulate_query
from app.services.retrieval import retrieve

router = APIRouter(prefix="/api")


@router.post("/retrieve", response_model=RetrieveResponse)
def retrieve_endpoint(
    req: RetrieveRequest,
    settings: Settings = Depends(get_settings),
    client: QdrantClient = Depends(get_qdrant),
):
    history = [m.model_dump() for m in req.history] or None
    reformulated = reformulate_query(req.question, settings.reformulation_model, history, settings.reformulation_temperature)
    chunks = retrieve(reformulated, client, settings)

    return RetrieveResponse(
        chunks=[RetrieveChunk(**c) for c in chunks],
        reformulated_query=reformulated,
    )
