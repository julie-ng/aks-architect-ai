from fastapi import APIRouter, Depends
from qdrant_client import QdrantClient

from app.config import Settings
from app.dependencies import get_qdrant, get_settings
from app.models import ChatRequest, ChatResponse, Source
from app.services.llm import generate_answer
from app.services.reformulation import reformulate_query
from app.services.retrieval import retrieve

router = APIRouter(prefix="/api")


@router.post("/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    settings: Settings = Depends(get_settings),
    client: QdrantClient = Depends(get_qdrant),
):
    reformulated = reformulate_query(req.question, settings.chat_model)
    chunks = retrieve(reformulated, client, settings)
    answer = generate_answer(req.question, chunks, settings.chat_model)

    sources = [
        Source(
            title=c["title"],
            url=c["url"],
            score=c["score"],
            text_preview=c["text"][:200],
        )
        for c in chunks
    ]

    return ChatResponse(
        answer=answer,
        sources=sources,
        reformulated_query=reformulated,
    )
