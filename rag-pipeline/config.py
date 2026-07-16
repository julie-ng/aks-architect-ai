"""
Configuration for RAG pipeline scripts.

All values can be overridden via environment variables.
Embeddings run on AWS Bedrock Titan; tagging still runs on Ollama (or Anthropic)
locally, hence ollama_host remains.
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    database_url: str
    ollama_host: str
    aws_region: str
    embedding_model: str
    embedding_vector_dim: int
    embedding_batch_size: int
    retrieval_top_k: int
    chunk_max_chars: int
    chunk_min_chars: int
    tagging_model: str
    tagging_provider: str


config_defaults = Config(
    database_url="postgresql://aks_architect:localdev@localhost:5432/aks_architect",
    # ollama_host is used only by tagging (tag.py) now — embeddings moved to Bedrock.
    ollama_host="http://localhost:11434",
    aws_region="eu-west-1",
    # Bedrock Titan Text Embeddings V2. No search_document/search_query prefixes —
    # Titan takes raw text (see helpers/embedding.py).
    embedding_model="amazon.titan-embed-text-v2:0",
    embedding_vector_dim=1024,
    embedding_batch_size=50,
    retrieval_top_k=5,
    chunk_max_chars=1500,
    chunk_min_chars=100,
    # Tagging runs on Bedrock Nova Micro — AWS-native, no Anthropic key, uses the
    # same region/credentials as embeddings. Falls back to ollama/anthropic via env.
    # NOTE: Nova requires a cross-region INFERENCE PROFILE id (eu.*), not the bare
    # on-demand model id — bare amazon.nova-micro-v1:0 fails in eu-west-1.
    tagging_model="eu.amazon.nova-micro-v1:0",
    tagging_provider="bedrock",
)

config = Config(
    database_url=os.environ.get("DATABASE_URL", config_defaults.database_url),
    ollama_host=os.environ.get("OLLAMA_HOST", config_defaults.ollama_host),
    aws_region=os.environ.get("AWS_REGION", config_defaults.aws_region),
    embedding_model=os.environ.get("EMBEDDING_MODEL", config_defaults.embedding_model),
    embedding_vector_dim=int(os.environ.get("EMBEDDING_VECTOR_DIM", str(config_defaults.embedding_vector_dim))),
    embedding_batch_size=int(os.environ.get("EMBEDDING_BATCH_SIZE", str(config_defaults.embedding_batch_size))),
    retrieval_top_k=int(os.environ.get("RETRIEVAL_TOP_K", str(config_defaults.retrieval_top_k))),
    chunk_max_chars=int(os.environ.get("CHUNK_MAX_CHARS", str(config_defaults.chunk_max_chars))),
    chunk_min_chars=int(os.environ.get("CHUNK_MIN_CHARS", str(config_defaults.chunk_min_chars))),
    tagging_model=os.environ.get("TAGGING_MODEL", config_defaults.tagging_model),
    tagging_provider=os.environ.get("TAGGING_PROVIDER", config_defaults.tagging_provider),
)
