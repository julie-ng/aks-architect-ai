# AKS Architect

AI-assisted architecture advisor for Azure Kubernetes Service (AKS). Data pipeline is complete (crawl → chunk → embed → query). Advisor layer: FastAPI backend (retrieval + chat) and Nuxt 3 streaming chat UI.

## Project Structure

```
web-scraper/              # Crawlee-based scraper for Microsoft Learn docs
  src/
    main.ts               # Entry point — loads sources, runs crawler
    crawler.ts            # CheerioCrawler: HTML extraction → Markdown via Turndown
    types.ts              # Source, SourcesConfig, PageResult interfaces
    utils/
      load-sources.ts           # Parses SOURCES.yaml
      get-seed-urls.ts          # Extracts seed URLs from sources
      get-allowed-globs.ts      # Extracts URL glob patterns for link following
      match-source.ts           # Maps a crawled URL back to its source config
      auto-detect-doc-type.ts   # Infers doc_type tag from URL path patterns
  SOURCES.yaml            # Defines crawl sources (seed URLs, globs, priority, tags)
  storage/                # Crawlee runtime data (gitignored)

rag-pipeline/             # Python pipeline: chunk → embed → query
  chunk.py                # Read crawler JSON → chunk markdown → output chunks.jsonl
  embed.py                # Embed chunks via Ollama → upsert into Qdrant
  query.py                # Embed a question → search Qdrant → print results
  helpers/
    chunking.py           # Pure functions: split_by_headings, split_on_paragraphs, merge, dedup
  tests/
    helpers/
      test_chunking.py    # Unit tests for chunking helpers
  pyproject.toml          # uv project config + dependencies

advisor-api/              # FastAPI backend: RAG retrieval + LLM chat
  app/
    main.py               # FastAPI app, CORS, lifespan
    config.py             # pydantic-settings (all config via env vars)
    models.py             # Pydantic request/response schemas
    dependencies.py       # Depends() for Qdrant, Settings
    routers/
      chat.py             # POST /api/chat, POST /api/retrieve
      healthz.py          # GET /healthz (IETF-style health check)
    services/
      retrieval.py        # embed + search Qdrant
      llm.py              # answer generation via Ollama
      reformulation.py    # query rewriting via Ollama
  tests/
  Dockerfile
  pyproject.toml

advisor-ui/               # Nuxt 3 streaming chat UI
  app/
    pages/index.vue       # Chat page
    components/
      ChatMessage.vue     # Message bubble (user/assistant)
  server/
    api/chat.post.ts      # Nuxt server route: retrieve from FastAPI + stream via AI SDK
    utils/
      provider.ts         # LLM provider factory (Ollama local / Azure OpenAI prod)
      system-prompt.ts    # Reads shared system-prompt.txt
  nuxt.config.ts
  package.json

system-prompt.txt         # Shared system prompt (used by both advisor-api and advisor-ui)
docker-compose.dev.yaml   # Qdrant + advisor-api containers
.github/workflows/
  unit-tests.yaml         # CI: web-scraper, rag-pipeline, advisor-api, advisor-ui
```

## Web Scraper

### Tech Stack
- **Runtime:** Node.js >=22, TypeScript (tsx for execution)
- **Crawler:** [Crawlee](https://crawlee.dev/) (CheerioCrawler) — Cheerio for HTML parsing, no browser needed
- **HTML → Markdown:** Turndown with GFM plugin
- **Tests:** Vitest
- **Config format:** YAML (parsed with `yaml` package)

### Key Commands
```bash
cd web-scraper
npm run crawl        # Run the crawler (tsx src/main.ts)
npm run clean        # Delete all storage/ data
npm run test         # Vitest run
npm run test:watch   # Vitest watch mode
```

### How the Crawler Works
1. `SOURCES.yaml` defines documentation sources with seed URLs, allowed URL globs, priority scores, and tags
2. Crawler follows links within allowed globs, filtering to `/en-us/` locale only
3. Content extraction targets `main div.content` blocks, filtering out the title-only `div.content` (contains just `<h1>`) to avoid duplicating content
4. Page title is taken from the `<title>` tag (with ` | Microsoft Learn` suffix stripped), not from the DOM body
5. Noise elements are stripped before Turndown conversion (feedback sections, breadcrumbs, AI summaries, etc.)
6. Each page is saved as a JSON record with: url, title, description, markdown, source_name, priority, tags, crawled_at
7. Rate-limited: 3 concurrent requests, 40 req/min

### Content Extraction — Noise Removal
Microsoft Learn pages have multiple `div.content` blocks inside `<main>`. The crawler filters out blocks that only contain an `<h1>` (title wrapper) and keeps the body content block(s). Elements removed before markdown conversion:
- `#article-header`, `#article-metadata`, `#center-doc-outline` — page chrome
- `[unauthorized-private-section]`, `[data-id="ai-summary"]` — access gates and AI summaries
- `.feedback-section`, `.action-container`, `.contributor-guide` — interactive UI
- `#side-doc-outline`, `.page-metadata`, `.breadcrumb`, `.alert-holder` — navigation

Turndown also globally strips: `nav`, `aside`, `header`, `footer`, `script`, `style`, `noscript`.

### Documentation Sources (SOURCES.yaml)
| Source | Description | Priority |
|--------|-------------|----------|
| waf-aks | Well-Architected Framework AKS service guide | 20 |
| aac-reference-architectures | Azure Architecture Center reference architectures | 10 |
| caf-landing-zone | Cloud Adoption Framework AKS Landing Zone | 20 |
| aks-pci-regulated | PCI DSS regulated cluster docs | 10 |

Core AKS docs source (`aks-docs`) is defined but commented out.

### Re-crawling
To re-crawl from scratch, delete all Crawlee storage (dataset, request queue, and session state):
```bash
rm -rf storage/
npm run crawl
```

## RAG Pipeline

### Tech Stack
- **Language:** Python >=3.11
- **Package manager:** [uv](https://docs.astral.sh/uv/)
- **Vector DB:** [Qdrant](https://qdrant.tech/) — local via Docker, upgrade path to Qdrant Cloud on Azure
- **Embeddings (local):** `nomic-embed-text` via [Ollama](https://ollama.com/)
- **Embeddings (production):** Azure OpenAI (requires re-embedding on deploy)
- **Tests:** pytest

### Key Commands
```bash
# Start Qdrant (dashboard at http://localhost:6333/dashboard)
docker compose -f docker-compose.dev.yaml up -d

# Install Python deps
cd rag-pipeline
uv sync

# Run the full pipeline
uv run python chunk.py                # 1. Chunk crawled docs → chunks.jsonl
uv run python embed.py                # 2. Embed chunks → Qdrant (recreates collection)
uv run python query.py "your question" # 3. Search Qdrant

# Tests
uv run pytest                         # Run unit tests
```

### Pipeline Stages
1. **Chunk** (`chunk.py`) — splits markdown on `##`/`###`/`####` headings, merges tiny fragments, deduplicates, further splits oversized sections on paragraph breaks. Outputs `chunks.jsonl`.
2. **Embed** (`embed.py`) — reads `chunks.jsonl`, calls Ollama/nomic-embed-text with `search_document:` prefix, recreates Qdrant collection, upserts vectors with metadata as payload. Batches upserts (50 at a time).
3. **Query** (`query.py`) — takes a question string, embeds with `search_query:` prefix, searches Qdrant for top-k nearest chunks, prints results with title, URL, score, and text preview.

### Embedding Prefixes
nomic-embed-text uses task-specific prefixes for better retrieval:
- `embed.py` prepends `search_document: ` when embedding chunks
- `query.py` prepends `search_query: ` when embedding questions

Changing prefixes requires re-embedding (`uv run python embed.py`).

### Chunking Tunables
Defined in `helpers/chunking.py`:
- `MAX_CHARS = 1500` — max chunk size (~300–400 tokens, safe for nomic-embed-text's 2048 token limit)
- `MIN_CHARS = 100` — minimum size; smaller fragments are merged or discarded

### Embedding Tunables
Defined at the top of `embed.py`:
- `BATCH_SIZE = 50` — points per Qdrant upsert call
- `VECTOR_DIM = 768` — nomic-embed-text output dimension
- `Distance.COSINE` — similarity metric for the Qdrant collection

### Chunk Output Format
```json
{
  "id": "<uuid>",
  "text": "## Section heading\n\nContent...",
  "url": "https://learn.microsoft.com/...",
  "title": "Page title",
  "description": "Meta description",
  "source_name": "aac-reference-architectures",
  "priority": 10,
  "tags": { "source_category": "aac", "doc_type": "reference-architecture" },
  "chunk_index": 3,
  "chunk_total": 12,
  "crawled_at": "2026-03-09T..."
}
```

## Advisor API

### Tech Stack
- **Language:** Python >=3.11
- **Framework:** FastAPI
- **Package manager:** uv
- **Tests:** pytest + httpx (TestClient)

### Key Commands
```bash
make advisor-api/test     # Run tests
make dc/up                # Start Qdrant + advisor-api via Docker Compose
```

### Endpoints
- `POST /api/chat` — full pipeline: reformulate → retrieve → generate answer (synchronous)
- `POST /api/retrieve` — retrieval only: reformulate → embed → search Qdrant → return chunks (no LLM)
- `GET /healthz` — IETF-style health check (Qdrant + Ollama connectivity)

### Architecture
```
POST /api/chat:      question → reformulate → retrieve → generate_answer → ChatResponse
POST /api/retrieve:  question → reformulate → retrieve → RetrieveResponse (chunks only)
```

The `/api/retrieve` endpoint is used by the Nuxt UI's server route to get RAG context without LLM generation (the UI handles streaming LLM calls via AI SDK).

### Configuration
All via environment variables (pydantic-settings). Key settings:
- `QDRANT_URL`, `QDRANT_COLLECTION`, `EMBEDDING_MODEL`, `CHAT_MODEL`
- `SYSTEM_PROMPT_PATH` — path to shared `system-prompt.txt` (default: `system-prompt.txt`)
- `OPENAPI_DOCS_ENABLED` — disabled by default, enabled in docker-compose.dev.yaml

## Advisor UI

### Tech Stack
- **Framework:** Nuxt 3 (Vue 3)
- **Components:** @nuxt/ui (Tailwind-based)
- **AI SDK:** `ai` (core) + `@ai-sdk/vue` (useChat composable)
- **LLM Providers:** `ollama-ai-provider` (local), `@ai-sdk/azure` (production)
- **Package manager:** npm

### Key Commands
```bash
make advisor-ui/install   # Install dependencies
make advisor-ui/dev       # Start dev server on :3000
```

### Architecture
```
Browser → useChat (@ai-sdk/vue) → Nuxt server route (POST /api/chat)
  1. Calls FastAPI POST /api/retrieve → gets RAG chunks
  2. Calls streamText() with system prompt + chunks → streams tokens back
  Provider: ollama('llama3.2') locally / azure('deployment') in prod
```

The Nuxt server route acts as the LLM orchestrator: it fetches retrieval context from FastAPI, then streams the LLM response directly to the browser via AI SDK's data stream protocol.

### Configuration
Server-only runtime config in `nuxt.config.ts`. Env vars auto-map with `NUXT_` prefix:
- `NUXT_ADVISOR_API_URL` — FastAPI URL (default: `http://localhost:8000`)
- `NUXT_PROVIDER` — `ollama` or `azure` (default: `ollama`)
- `NUXT_OLLAMA_BASE_URL` — Ollama URL (default: `http://localhost:11434`)
- `NUXT_CHAT_MODEL` — model name (default: `llama3.2`)
- `NUXT_AZURE_API_KEY`, `NUXT_AZURE_ENDPOINT`, `NUXT_AZURE_DEPLOYMENT` — for Azure OpenAI

### Shared System Prompt
`system-prompt.txt` at the project root is read by both advisor-api (Python) and advisor-ui (Node). For Docker, it's mounted into the advisor-api container via docker-compose.

## CI

GitHub Actions workflow (`.github/workflows/unit-tests.yaml`) runs on pushes to `main` and PRs. Four parallel jobs: web-scraper (vitest), rag-pipeline (pytest), advisor-api (pytest), advisor-ui (build smoke test).
