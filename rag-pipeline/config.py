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
    storage_backend: str
    s3_bucket: str
    pipeline_run_id: str
    storage_base_dir: str
    # Temporal orchestration (workflows/). Queue names, fan-out concurrency, and
    # retry ceilings are env-overridable; the retry-policy SHAPE (exponential
    # backoff) and stage/queue split are architectural (in workflows/shared.py).
    temporal_address: str
    temporal_namespace: str
    temporal_bedrock_queue: str
    temporal_db_queue: str
    temporal_default_queue: str
    temporal_fanout_concurrency: int
    temporal_bedrock_max_attempts: int
    temporal_db_load_max_attempts: int
    temporal_local_max_attempts: int


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
    # Pipeline artifact storage. `local` reads/writes files under storage_base_dir
    # (dev default); `s3` reads/writes under s3://<s3_bucket>/<pipeline_run_id>/.
    # See helpers/storage.py. Defaults are dev-safe (local, no AWS needed).
    storage_backend="local",
    s3_bucket="",
    pipeline_run_id="",
    storage_base_dir=".",
    # Temporal. Address/namespace target the local CLI dev server by default
    # (phase 4 points these at Temporal Cloud). Queues split by throttled resource
    # (no env prefix scheme yet — premature for a POC). Concurrency + retry ceilings
    # are the tunable knobs (Semaphore is the primary throttle-avoidance lever).
    temporal_address="localhost:7233",
    temporal_namespace="default",
    temporal_bedrock_queue="bedrock-queue",
    temporal_db_queue="db-queue",
    temporal_default_queue="default",
    temporal_fanout_concurrency=10,
    temporal_bedrock_max_attempts=8,
    temporal_db_load_max_attempts=2,
    # Local/deterministic activities (chunk, read_sources, manifest read). A failure is
    # almost always a real problem (missing artifact), not transient → low ceiling, fail
    # fast. Without this they inherit Temporal's default of UNLIMITED retries.
    temporal_local_max_attempts=3,
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
    storage_backend=os.environ.get("STORAGE_BACKEND", config_defaults.storage_backend),
    s3_bucket=os.environ.get("S3_BUCKET", config_defaults.s3_bucket),
    pipeline_run_id=os.environ.get("PIPELINE_RUN_ID", config_defaults.pipeline_run_id),
    storage_base_dir=os.environ.get("STORAGE_BASE_DIR", config_defaults.storage_base_dir),
    temporal_address=os.environ.get("TEMPORAL_ADDRESS", config_defaults.temporal_address),
    temporal_namespace=os.environ.get("TEMPORAL_NAMESPACE", config_defaults.temporal_namespace),
    temporal_bedrock_queue=os.environ.get("TEMPORAL_BEDROCK_QUEUE", config_defaults.temporal_bedrock_queue),
    temporal_db_queue=os.environ.get("TEMPORAL_DB_QUEUE", config_defaults.temporal_db_queue),
    temporal_default_queue=os.environ.get("TEMPORAL_DEFAULT_QUEUE", config_defaults.temporal_default_queue),
    temporal_fanout_concurrency=int(
        os.environ.get("TEMPORAL_FANOUT_CONCURRENCY", str(config_defaults.temporal_fanout_concurrency))
    ),
    temporal_bedrock_max_attempts=int(
        os.environ.get("TEMPORAL_BEDROCK_MAX_ATTEMPTS", str(config_defaults.temporal_bedrock_max_attempts))
    ),
    temporal_db_load_max_attempts=int(
        os.environ.get("TEMPORAL_DB_LOAD_MAX_ATTEMPTS", str(config_defaults.temporal_db_load_max_attempts))
    ),
    temporal_local_max_attempts=int(
        os.environ.get("TEMPORAL_LOCAL_MAX_ATTEMPTS", str(config_defaults.temporal_local_max_attempts))
    ),
)
