from typing import Literal

from pydantic_settings import BaseSettings


# Default Configuration
# - overwritten by environment variables. See docs:
# - https://docs.pydantic.dev/latest/concepts/pydantic_settings/#parsing-environment-variable-values
class Settings(BaseSettings):
    app_environment: Literal["development", "production"] = "production"
    database_url: str = "postgresql://aks_architect:localdev@localhost:5432/aks_architect"
    # Embeddings run on Bedrock Titan V2 (matches the offline pipeline so query and
    # document vectors are identical). Titan takes RAW text — no nomic-style prefix,
    # hence the prefixes default to empty. `embedding_provider=ollama` restores the
    # local nomic path for offline dev.
    embedding_provider: Literal["bedrock", "ollama"] = "bedrock"
    embedding_model: str = "amazon.titan-embed-text-v2:0"
    embedding_vector_dim: int = 1024
    embedding_prefix: str = ""
    document_prefix: str = ""
    aws_region: str = "eu-west-1"
    chat_model: str = "llama3.2"
    # Query reformulation on Bedrock Nova Micro (cross-region eu.* inference profile —
    # the bare model id fails in eu-west-1). Same region/credentials as the Titan call.
    reformulation_provider: Literal["ollama", "anthropic", "bedrock"] = "bedrock"
    reformulation_model: str = "eu.amazon.nova-micro-v1:0"
    reformulation_temperature: float = 0.1
    cors_origins: list[str] = ["http://localhost:3000"]
    retrieval_top_k: int = 5
    priority_boost_weight: float = 0.1
    openapi_docs_enabled: bool = False
