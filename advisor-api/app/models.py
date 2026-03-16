from typing import Literal

from pydantic import BaseModel


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    question: str
    history: list[HistoryMessage] = []


class Source(BaseModel):
    title: str
    url: str
    score: float
    text_preview: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    reformulated_query: str


class RetrieveRequest(BaseModel):
    question: str
    history: list[HistoryMessage] = []


class RetrieveChunk(BaseModel):
    id: str
    title: str
    url: str
    score: float
    boosted_score: float
    text: str
    tags: dict
    priority: int | None


class RetrieveResponse(BaseModel):
    chunks: list[RetrieveChunk]
    reformulated_query: str
