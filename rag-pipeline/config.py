"""
Configuration for RAG pipeline scripts.

All values can be overridden via environment variables.
Defaults are suitable for local development with Ollama + Postgres/pgvector.
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    database_url: str
    ollama_host: str
    embedding_model: str
    embedding_prefix_document: str
    embedding_prefix_query: str
    embedding_vector_dim: int
    embedding_batch_size: int
    retrieval_top_k: int
    chunk_max_chars: int
    chunk_min_chars: int
    tagging_model: str
    tagging_provider: str


config_defaults = Config(
    database_url="postgresql://aks_architect:localdev@localhost:5432/aks_architect",
    ollama_host="http://localhost:11434",
    embedding_model="nomic-embed-text",
    embedding_prefix_document="search_document: ",
    embedding_prefix_query="search_query: ",
    embedding_vector_dim=768,
    embedding_batch_size=50,
    retrieval_top_k=5,
    chunk_max_chars=1500,
    chunk_min_chars=100,
    tagging_model="claude-haiku-4-5-20251001",
    tagging_provider="anthropic",
)

config = Config(
    database_url=os.environ.get("DATABASE_URL", config_defaults.database_url),
    ollama_host=os.environ.get("OLLAMA_HOST", config_defaults.ollama_host),
    embedding_model=os.environ.get("EMBEDDING_MODEL", config_defaults.embedding_model),
    embedding_prefix_document=os.environ.get("EMBEDDING_PREFIX_DOCUMENT", config_defaults.embedding_prefix_document),
    embedding_prefix_query=os.environ.get("EMBEDDING_PREFIX_QUERY", config_defaults.embedding_prefix_query),
    embedding_vector_dim=int(os.environ.get("EMBEDDING_VECTOR_DIM", str(config_defaults.embedding_vector_dim))),
    embedding_batch_size=int(os.environ.get("EMBEDDING_BATCH_SIZE", str(config_defaults.embedding_batch_size))),
    retrieval_top_k=int(os.environ.get("RETRIEVAL_TOP_K", str(config_defaults.retrieval_top_k))),
    chunk_max_chars=int(os.environ.get("CHUNK_MAX_CHARS", str(config_defaults.chunk_max_chars))),
    chunk_min_chars=int(os.environ.get("CHUNK_MIN_CHARS", str(config_defaults.chunk_min_chars))),
    tagging_model=os.environ.get("TAGGING_MODEL", config_defaults.tagging_model),
    tagging_provider=os.environ.get("TAGGING_PROVIDER", config_defaults.tagging_provider),
)
