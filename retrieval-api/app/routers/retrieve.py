from fastapi import APIRouter, Depends
from psycopg import Connection

from app.config import Settings
from app.dependencies import get_db, get_settings
from app.models import RetrieveChunk, RetrieveRequest, RetrieveResponse
from app.services.reformulation import reformulate_query
from app.services.retrieval import retrieve

router = APIRouter(prefix="/api")


@router.post("/retrieve", response_model=RetrieveResponse)
def retrieve_endpoint(
    req: RetrieveRequest,
    settings: Settings = Depends(get_settings),
    conn: Connection = Depends(get_db),
):
    history = [m.model_dump() for m in req.history] or None
    reformulated = reformulate_query(
        req.question,
        settings.reformulation_model,
        history,
        settings.reformulation_temperature,
    )
    chunks = retrieve(reformulated, conn, settings)

    return RetrieveResponse(
        chunks=[RetrieveChunk(**c) for c in chunks],
        reformulated_query=reformulated,
    )
