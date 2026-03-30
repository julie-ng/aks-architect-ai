# RAG Pipeline

Python scripts that transform scraped docs into searchable vectors in Postgres/pgvector.

### Features

- **Heading-aware chunking** — splits markdown on `##`/`###`/`####` headings, preserving section context per chunk
- **Smart merging** — tiny fragments are merged with neighbors; oversized chunks are further split on paragraph breaks
- **Task-prefixed embeddings** — uses `nomic-embed-text` with `search_document:` prefix for asymmetric retrieval (queries use `search_query:`)
- **LLM-based chunk tagging** — classifies chunks against a taxonomy derived from the app's design framework (topics + answer labels)
- **Taxonomy from source of truth** — tag vocabulary is extracted from advisor-ui content YAML frontmatter, not maintained separately

#### Design Framework Taxonomy

- `helpers/taxonomy.py` parses YAML frontmatter _directly_ from [`advisor-ui/content/aks/`](./../advisor-ui/content/aks/) 
- Decisions and requirements share one source of truth between the UI and the pipeline. 
- A debug endpoint at [/api/_debug/taxonomy](http://localhost:3000/api/_debug/taxonomy) is available for humans to inspect the parsed taxonomy.

**Excerpt of taxonomy as JSON**

```json
{
  "total": 55,
  "topics": [
    {
      "tag": "topic:organization-type",
      "label": "Organization Type",
      "source": "requirements"
    },
    {
      "tag": "topic:team-role",
      "label": "AKS User Role",
      "source": "requirements"
    },
    {
      "tag": "answer:managed_services",
      "label": "Managed Azure Services (PaaS)",
      "source": "decisions/storage-strategy"
    },
    {
      "tag": "answer:stateful",
      "label": "Stateful with Persistent Volumes",
      "source": "decisions/storage-strategy"
    },
    …
  ]
}
```

### Pipeline Stages

```
chunk.py → tag.py → embed.py
```

| Stage | Input | Output | Description |
|:--|:--|:--|:--|
| `chunk.py` | Crawled JSON docs | `chunks.jsonl` | Split markdown by headings, merge/split to target size |
| `tag.py` | `chunks.jsonl` | `tagged_chunks.jsonl` | LLM classifies each chunk against design framework taxonomy |
| `embed.py` | `tagged_chunks.jsonl` | Postgres/pgvector | Generate vectors via Ollama, insert with full metadata |
| `query.py` | Question string | Terminal output | Test retrieval: embed question, search, print results |

### Learning: Chunk Size Matters

Targeting 300-400 tokens per chunk (max 1500 chars) balances specificity with context. Too small and chunks lose meaning; too large and embeddings become diluted. The heading-aware split keeps semantically related content together rather than splitting mid-paragraph.

## Commands

```bash
# Full pipeline
make rag-pipeline

# Individual stages
uv run python chunk.py
uv run python tag.py
uv run python embed.py

# Test retrieval
uv run python query.py "How should I configure networking for AKS?"
```

## Configuration

All settings via env vars. Defaults in [`config.py`](./config.py).

| Env Var | Default | Description |
|:--|:--|:--|
| `DATABASE_URL` | See [`docker-compose.dev.yaml`](./../docker-compose.dev.yaml) | Postgres connection string |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Ollama embedding model |
| `EMBEDDING_PREFIX_DOCUMENT` | `search_document: ` | Prefix for chunk embeddings |
| `EMBEDDING_PREFIX_QUERY` | `search_query: ` | Prefix for query embeddings |
| `EMBEDDING_VECTOR_DIM` | `768` | Vector dimensions (must match model) |
| `EMBEDDING_BATCH_SIZE` | `50` | Chunks per database insert batch |
| `CHUNK_MAX_CHARS` | `1500` | Max chunk size (~300-400 tokens) |
| `CHUNK_MIN_CHARS` | `100` | Min chunk size before merging |
| `TAGGING_MODEL` | `gemma3:4b` | LLM for chunk classification |
| `TAGGING_PROVIDER` | `ollama` | `ollama` or `anthropic` |

> [!NOTE]
> Changing embedding prefixes or model requires re-running `embed.py` to regenerate all vectors.
