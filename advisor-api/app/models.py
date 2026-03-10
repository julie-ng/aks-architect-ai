from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str


class Source(BaseModel):
    title: str
    url: str
    score: float
    text_preview: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    reformulated_query: str
