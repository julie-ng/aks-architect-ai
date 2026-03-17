# Advisor API

This is the **retrieval** backend service powered by FastAPI.

## Local Development

> [!NOTE]
> This component has dependencies. See parent [README.md](./../README.md) about using the `docker-compose.dev.yaml` file to start up the entire stack.

## API Endpoints

| Method | Path | Description |
|:--|:--|:--|
| `POST` | `/api/chat` | Full pipeline: reformulate → retrieve → generate answer |
| `POST` | `/api/retrieve` | Retrieval only: reformulate → embed → search Qdrant (no LLM) |
| `GET` | `/healthz` | IETF-style health check (Qdrant + Ollama connectivity) |

## Configuration

All settings via env vars (pydantic-settings). Defined in [`app/config.py`](./app/config.py).

| Env Var | Default | Description |
|:--|:--|:--|
| `QDRANT_URL` | `http://localhost:6333` | Qdrant endpoint |
| `QDRANT_COLLECTION` | `aks-docs` | Collection name |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Ollama embedding model |
| `EMBEDDING_PREFIX` | `search_query: ` | Prefix prepended to queries before embedding |
| `DOCUMENT_PREFIX` | `search_document: ` | Prefix for document embedding (used in pipeline, not API) |
| `CHAT_MODEL` | `llama3.2` | Ollama model for chat + reformulation |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins |
| `RETRIEVAL_TOP_K` | `5` | Number of chunks returned after re-ranking |
| `PRIORITY_BOOST_WEIGHT` | `0.1` | How much priority influences ranking (see [Weights](#weights)) |
| `SYSTEM_PROMPT_PATH` | `system-prompt.md` | Path to shared system prompt |
| `OPENAPI_DOCS_ENABLED` | `False` | Enable Swagger UI at `/docs` |

## Retrieval Process

1. Fetch `top_k * 3` candidates from Qdrant by cosine similarity
2. Re-rank using priority boosting
3. Trim to `top_k` (default: 5)
 
The extra candidates ensure high-priority chunks can overtake slightly-more-similar low-priority ones.

## Ranking Sources

This section describes how we are combining official docs with human curation and handwritten docs.

### Source Priority

Used tiered, categorical.

| Category | Number (Range) | Description |
|:--|:--|:--|
| Neutral | 10 | Default for crawled docs |
| Recommended | 20 | Hand-picked official docs, satisfy most use cases, offer good balance |
| Curated | 50 | My own written docs |

N.B. Use orders of magnitude (1, 10, 100) only for dramatic separation. Overkill here since `log()` already compresses the scale.

> [!IMPORTANT]
> If the priorities are adjusted in the [`SOURCES.yaml`](./../web-scraper/SOURCES.yaml) file, you'll need to rebuild the vector index. See [`Makefile`](./../Makefile) for appropriate commands.

### Boosted Scores

The current setup:

| Priority | log(priority) | Boost Factor (weight=0.1) |
|:--|:--|:--|
| 10 | 2.3 | 1.23 |
| 20 | 3.0 | 1.30 |
| 50 | 3.9 | 1.39 |

### Weights

Formula: `boosted = similarity * (1 + log(priority) * weight)`

The `weight` is set via `PRIORITY_BOOST_WEIGHT` env var (default: `0.1`).

- **weight = 0** — priority ignored, pure similarity ranking
- **weight = 0.1** — gentle nudge, priority matters but similarity still dominates
- **weight = 0.2** — stronger, priority-50 content beats similarity-matched priority-10 content more aggressively

Example: priority-50 chunk (similarity 0.70) vs. priority-10 chunk (similarity 0.74):

| Weight | Priority 50 @ 0.70 | Priority 10 @ 0.74 | Winner |
|:--|:--|:--|:--|
| 0.0 | 0.70 | 0.74 | Priority 10 |
| 0.1 | 0.97 | 0.91 | Priority 50 |
| 0.2 | 1.25 | 1.08 | Priority 50 (by more) |
