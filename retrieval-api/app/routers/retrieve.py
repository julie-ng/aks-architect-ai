import logging

from fastapi import APIRouter, Depends
from psycopg import Connection

from app.config import Settings
from app.dependencies import get_db, get_settings
from app.models import RetrieveChunk, RetrieveRequest, RetrieveResponse
from app.services.reformulation import reformulate_query
from app.services.retrieval import retrieve

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.post("/retrieve", response_model=RetrieveResponse)
def retrieve_endpoint(
    req: RetrieveRequest,
    settings: Settings = Depends(get_settings),
    conn: Connection = Depends(get_db),
):
    logger.info("[retrieve] question: %s", req.question)
    logger.info("[retrieve] design_context: %s", "yes" if req.design_context else "none")

    history = [m.model_dump() for m in req.history] or None
    reformulated = reformulate_query(
        req.question,
        settings.reformulation_model,
        history,
        settings.reformulation_temperature,
        req.design_context,
        settings.reformulation_provider,
    )
    logger.info("[retrieve] reformulated: %s", reformulated)

    chunks = retrieve(reformulated, conn, settings)
    for i, c in enumerate(chunks):
        logger.info(
            "[retrieve] chunk %d: score=%.3f boosted=%.3f title=%s",
            i,
            c["score"],
            c["boosted_score"],
            c["title"],
        )

    return RetrieveResponse(
        chunks=[RetrieveChunk(**c) for c in chunks],
        reformulated_query=reformulated,
    )
