from typing import Literal

from pydantic_settings import BaseSettings


# Default Configuration
# - overwritten by environment variables. See docs:
# - https://docs.pydantic.dev/latest/concepts/pydantic_settings/#parsing-environment-variable-values
class Settings(BaseSettings):
    app_environment: Literal["development", "production"] = "production"
    database_url: str = "postgresql://aks_architect:localdev@localhost:5432/aks_architect"
    embedding_model: str = "nomic-embed-text"
    embedding_prefix: str = "search_query: "
    document_prefix: str = "search_document: "
    chat_model: str = "llama3.2"
    reformulation_provider: Literal["ollama", "anthropic"] = "ollama"
    reformulation_model: str = "llama3.2"
    reformulation_temperature: float = 0.1
    cors_origins: list[str] = ["http://localhost:3000"]
    retrieval_top_k: int = 5
    priority_boost_weight: float = 0.1
    openapi_docs_enabled: bool = False
