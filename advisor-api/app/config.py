from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "aks-docs"
    embedding_model: str = "nomic-embed-text"
    embedding_prefix: str = "search_query: "
    document_prefix: str = "search_document: "
    chat_model: str = "llama3.2"
    cors_origins: list[str] = ["http://localhost:3000"]
    retrieval_top_k: int = 5
