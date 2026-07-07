# AKS Architect

AI-assisted architecture advisor for Azure Kubernetes Service (AKS). Offline knowledge pipeline is complete (crawl → chunk → tag → embed). Advisor layer: FastAPI retrieval backend and a Nuxt 4 streaming chat UI with design-aware, tool-calling chat.

## General
- Current year is 2026. Do not suggest deprecated packages or outdated patterns.
- Prefer environment variable configurations. Avoid hard coding variables in configuration files, e.g. `config.py`, `config.ts`, etc. Instead, read from environment variables that are defined in [docker-compose.dev.yaml](./docker-compose.dev.yaml) and `.env` (mirrored by `.env.sample`).

## APIs

- All HTTP APIs should have a `/healthz` endpoint that follows this [IETF proposal](https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check-06)

## MCP Server Preferences
- **Nuxt / Nuxt UI docs:** Always use `nuxt-remote` and `nuxt-ui-remote` MCP servers (official sources)
- **AI SDK, other libraries:** Use `context7` MCP server
- Never use `context7` for Nuxt or Nuxt UI documentation

## Data Flow

Two flows — an offline batch pipeline that populates the vector store, and an online request flow for chat:

```
Offline:  web-scraper → chunk.py → tag.py → embed.py → Postgres/pgvector
Online:   Browser (AI SDK Chat) → Nuxt POST /api/chat (orchestrator)
            → FastAPI POST /api/retrieve (reformulate → embed → pgvector search → chunks)
            → assemble system prompt (+ design context/tools) → streamText() → stream to browser
```

The FastAPI backend does retrieval only (no LLM answer). The Nuxt server route is the LLM orchestrator.

## Project Structure

```
web-scraper/              # Crawlee-based scraper for Microsoft Learn AKS docs
  src/
    main.ts               # Entry point — loads sources, runs crawler
    crawler.ts            # CheerioCrawler: HTML extraction → Markdown via Turndown
    types.ts              # Source, SourcesConfig, PageResult interfaces
    utils/
      load-sources.ts           # Parses the SOURCES/ directory of YAML files
      get-seed-urls.ts          # Extracts seed URLs from sources
      get-allowed-globs.ts      # Extracts URL glob patterns for link following
      match-source.ts           # Maps a crawled URL back to its source config
      auto-detect-doc-type.ts   # Infers doc_type tag from URL path patterns
  SOURCES/                # Directory of per-topic YAML source configs (see below)
  storage/                # Crawlee runtime data (gitignored)

rag-pipeline/             # Python pipeline: chunk → tag → embed → query
  chunk.py                # Read crawler JSON → chunk markdown → chunks.jsonl
  tag.py                  # LLM classifier: adds topic/answer tags → tagged_chunks.jsonl
  embed.py                # Embed chunks via Ollama → TRUNCATE + INSERT into Postgres/pgvector
  query.py                # Embed a question → pgvector search → print results
  config.py               # Frozen dataclass config (defaults + env overrides)
  helpers/
    chunking.py           # Pure functions: split_by_headings, split_on_paragraphs, merge, dedup
    taxonomy.py           # Controlled tag vocabulary for tag.py
  tests/
    helpers/
      test_chunking.py    # Unit tests for chunking helpers
  pyproject.toml          # uv project config + dependencies

retrieval-api/            # FastAPI backend: RAG retrieval (no LLM answer)
  app/
    main.py               # FastAPI app, CORS, lifespan
    config.py             # pydantic-settings (all config via env vars)
    models.py             # Pydantic request/response schemas
    dependencies.py       # Depends() for the Postgres pool, Settings
    routers/
      retrieve.py         # POST /api/retrieve
      healthz.py          # GET /healthz (IETF-style health check)
    services/
      retrieval.py        # embed + pgvector search + priority-boosted re-rank
      reformulation.py    # query rewriting via Ollama/Anthropic
  tests/
  Dockerfile
  pyproject.toml

advisor-ui/               # Nuxt 4 streaming chat UI (design-aware)
  app/
    pages/                # chat/[id], designs/[id], designs/[id]/configure, etc.
    components/           # ChatMessage, source-links, design/*, design-update-proposal, etc.
    models/Design.ts      # Framework-free, unit-tested Design domain model
    stores/               # Pinia: chats.store, chat-session.store, designs.store
    composables/          # useDesign, useNewDesign, useSpecSchema, useChatSession
    utils/                # Auto-imported, one function per file (citations, breadcrumbs, etc.)
  content/                # @nuxt/content v3 collections (frontmatter-driven)
    aks/decisions/        # Architecture decision specs (with per-answer waf_impact)
    aks/requirements/     # Requirement specs
    system-prompt/        # Markdown prompt sections stitched at runtime
  server/
    api/
      chat.post.ts        # Orchestrator: retrieve from FastAPI + stream via AI SDK
      waf-scores.post.ts  # Compute averaged WAF pillar scores from a design
      sessions/           # Chat session CRUD (index, [id] get/patch/delete)
      designs/            # Design CRUD
      auth/github.get.ts  # GitHub OAuth (nuxt-auth-utils)
    utils/                # Flat (no subdirs) — see below
    db/schema.ts          # Drizzle ORM tables: users, chatSessions, chatMessages, designs
  shared/utils/           # Zod v4 schemas + spec helpers (manually imported)
  nuxt.config.ts
  package.json

docker-compose.dev.yaml   # postgres (pgvector) + retrieval-api + advisor-ui
db/init.sql               # DB schema init for the pgvector container
.github/workflows/
  unit-tests.yaml         # Path-filtered CI: web-scraper, rag-pipeline, retrieval-api, advisor-ui
```

### advisor-ui `server/utils/` (flat, no subdirs)
`provider.ts` (LLM provider factory), `assemble-system-prompt.ts`, `select-domains.ts`, `system-prompt.ts`, `build-framework-schema.ts`, `fetch-design-context.ts`, `format-design-context.ts`, `detect-design-change.ts`, `design-snapshot-tool.ts`, `propose-design-update-tool.ts`, `format-context.ts`, `deduplicate-chunks.ts`, `extract-conversation-history.ts`, `check-ollama-model.ts`, `handle-chat-error.ts`, `require-user-id.ts`, `db.ts`, `logger.ts`.

## Web Scraper

### Tech Stack
- **Runtime:** Node.js >=22, TypeScript (tsx for execution)
- **Crawler:** [Crawlee](https://crawlee.dev/) (CheerioCrawler) — Cheerio for HTML parsing, no browser needed
- **HTML → Markdown:** Turndown with GFM plugin
- **Tests:** Vitest
- **Config format:** YAML (parsed with `yaml` package)

### Key Commands
```bash
make scraper/crawl   # Run the crawler
make scraper/clean   # Delete all storage/ data
make scraper/test    # Vitest run
```

### How the Crawler Works
1. `SOURCES/` holds one YAML file per topic, each defining seed URLs, allowed URL globs, priority scores, and tags
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

### Documentation Sources (`SOURCES/`)
Sources are organized as one YAML file per topic in the `SOURCES/` directory (e.g. `networking.yaml`, `security.yaml`, `storage.yaml`, `baseline-architecture.yaml`, `landing-zone-accelerator.yaml`, `best-practices.yaml`, `high-availability-setups.yaml`, `monitoring.yaml`, `operations.yaml`, `scale.yaml`, `workloads.yaml`, and more). Each file defines seed URLs, allowed globs, priority, and tags. Priority scores drive priority-boosted re-ranking at retrieval time.

### Re-crawling
To re-crawl from scratch, delete all Crawlee storage (dataset, request queue, and session state):
```bash
make scraper/clean
make scraper/crawl
```

## RAG Pipeline

### Tech Stack
- **Language:** Python >=3.11
- **Package manager:** [uv](https://docs.astral.sh/uv/)
- **Vector DB:** Postgres + [pgvector](https://github.com/pgvector/pgvector) (`pgvector/pgvector:pg17` locally; upgrade path to managed Postgres on Azure)
- **Embeddings:** `nomic-embed-text` via [Ollama](https://ollama.com/) (768-dim)
- **LLM (tagging):** `gemma3:4b` via Ollama, or Anthropic
- **Tests:** pytest

### Key Commands
```bash
# Start the dev stack (Postgres/pgvector + retrieval-api + advisor-ui)
make dc/up

# Install Python deps
cd rag-pipeline && uv sync

# Run the full pipeline
make pipeline/chunk    # 1. Chunk crawled docs → chunks.jsonl
make pipeline/tag      # 2. LLM-tag chunks → tagged_chunks.jsonl
make pipeline/embed    # 3. Embed chunks → Postgres/pgvector (TRUNCATE + INSERT)
make pipeline/query    # 4. Search (query.py "your question")

make rag-pipeline      # Runs the pipeline end to end
make pipeline/test     # Run unit tests
```

### Pipeline Stages
1. **Chunk** (`chunk.py`) — splits markdown on `##`/`###`/`####` headings, merges tiny fragments, deduplicates, further splits oversized sections on paragraph breaks. Outputs `chunks.jsonl`.
2. **Tag** (`tag.py`) — an LLM classifier tags each chunk against a controlled vocabulary (`helpers/taxonomy.py`); returns JSON tags, never invents them. Outputs `tagged_chunks.jsonl`.
3. **Embed** (`embed.py`) — calls Ollama/nomic-embed-text with the `search_document:` prefix, `TRUNCATE`s the `chunks` table, then batched `INSERT`s vectors + JSONB metadata into Postgres/pgvector.
4. **Query** (`query.py`) — embeds a question with the `search_query:` prefix, runs a pgvector cosine search, prints results with title, URL, score, and text preview.

### Embedding Prefixes
nomic-embed-text uses task-specific prefixes for better retrieval:
- `embed.py` prepends `search_document: ` when embedding chunks
- `query.py` prepends `search_query: ` when embedding questions

Changing prefixes requires re-embedding (`make pipeline/embed`).

### Chunking Tunables
Defined in `helpers/chunking.py` (env-tunable via `config.py`):
- `MAX_CHARS = 1500` — max chunk size (~300–400 tokens, safe for nomic-embed-text's 2048 token limit)
- `MIN_CHARS = 100` — minimum size; smaller fragments are merged or discarded

### Pipeline Re-run Order
- `embed.py` does `TRUNCATE` + `INSERT` — no need to manually clear the table.
- A full re-crawl requires deleting `web-scraper/storage/` (`make scraper/clean`).
- Full re-run: crawl → chunk → tag → embed → query.

## Retrieval API

### Tech Stack
- **Language:** Python >=3.11
- **Framework:** FastAPI
- **Store client:** `psycopg` v3 + `psycopg-pool` + `pgvector`
- **Package manager:** uv
- **Tests:** pytest + httpx (TestClient)

### Key Commands
```bash
make retrieval-api/test   # Run tests
make dc/up                # Start Postgres + retrieval-api + advisor-ui via Docker Compose
```

### Endpoints
- `POST /api/retrieve` — reformulate → embed → pgvector search → priority-boosted re-rank → return chunks (no LLM answer)
- `GET /healthz` — IETF-style health check (Postgres + Ollama connectivity, reports chunk_count and uptime)

### Retrieval Details
- **pgvector search** uses cosine distance: `1 - (embedding <=> :vector::vector) AS score`, `ORDER BY embedding <=> :vector`. Tag filters use JSONB (`tags->>'field'`).
- **Priority-boosted re-rank** (`boost_by_priority`): fetches `top_k * 3` candidates, then re-ranks with `boosted = similarity * (1 + log(priority) * weight)` so authoritative sources surface without swamping semantic relevance.
- **Reformulation** (`reformulation.py`): an LLM rewrites the user question into a standalone search query (resolves pronouns from history, expands abbreviations like k8s→Kubernetes, NSG→network security group), falling back to the raw question on any error.

### Configuration
All via environment variables (pydantic-settings). Key settings:
- `DATABASE_URL` — Postgres connection string
- `EMBEDDING_MODEL`, `CHAT_MODEL`, `REFORMULATION_PROVIDER`, `REFORMULATION_MODEL`
- `OPENAPI_DOCS_ENABLED` — disabled by default, enabled in docker-compose.dev.yaml

## Advisor UI

### Tech Stack
- **Framework:** Nuxt 4 (Vue 3)
- **Components:** @nuxt/ui v4 (Tailwind v4)
- **Content:** @nuxt/content v3 (frontmatter-driven decision/requirement taxonomy + prompt sections)
- **AI SDK:** `ai` v6 (core) + `@ai-sdk/vue` (Chat class)
- **LLM Providers:** `ollama-ai-provider-v2` (local/dev), `@ai-sdk/anthropic` (production) — swap via `NUXT_AI_PROVIDER`
- **Persistence:** Drizzle ORM + `postgres` driver (chat sessions, messages, designs, users)
- **Auth:** GitHub OAuth via `nuxt-auth-utils` (the app requires login)
- **State:** Pinia
- **Validation:** Zod v4 (`shared/utils/zod-schemas/`)
- **Package manager:** npm

### Key Commands
```bash
make advisor-ui/install   # Install dependencies
make advisor-ui/dev       # Start dev server on :3000 (runs natively — HMR is faster than Docker)
make advisor-ui/lint      # ESLint
```

### Architecture
```
Browser → new Chat() (@ai-sdk/vue) → Nuxt server route POST /api/chat
  1. Calls FastAPI POST /api/retrieve → gets RAG chunks
  2. If a designId is linked: fetch design context, detect design changes,
     build the framework schema, and enable design tools (all in parallel)
  3. Assembles the system prompt (domain-filtered + XML blocks)
  4. streamText() with tools (stepCountIs(3)) → streams tokens back
  Provider: ollama('gemma3:4b') locally / anthropic(deployment) in prod
```

The Nuxt server route is the LLM orchestrator: it fetches retrieval context from FastAPI, assembles the prompt, then streams the LLM response to the browser via AI SDK's UI message stream protocol (`createUIMessageStream`), which renders typing indicators immediately while retrieval runs server-side.

### Design-Aware Chat
A chat can be linked to a **design** — a structured spec (decisions + requirements) the user builds. When linked:
1. **Inject** — design requirements/decisions go into the system prompt inside `<design>` tags.
2. **Surface changes** — if the design changed since the last message (`designs.updatedAt > chatSessions.updatedAt`), a `<design-change>` block tells the LLM to call `getDesignSnapshot` before answering.
3. **Propose updates (human-in-the-loop)** — the `proposeDesignUpdate` tool suggests a decision/requirement change but does **not** write to the DB; it returns a proposal the UI renders with Accept/Dismiss (`design-update-proposal.vue`). The human commits the change.
4. **Framework-aware** — a compact framework schema (valid keys/answers, from the content collections) is injected so proposals use real values.

Tools are only enabled when a design is linked. Tool loops are capped with `stepCountIs(3)`.

### Content & WAF Scoring
- `content/aks/decisions/` and `content/aks/requirements/` are markdown files (`@nuxt/content` v3). Frontmatter uses the `spec:` key with `title`, `question`, `question_type` (radio/checkbox), `reference`, and `answers[]`.
- Each answer carries `waf_impact` — scores across 5 Well-Architected Framework pillars (reliability, security, cost, operations, performance). `server/api/waf-scores.post.ts` averages these into a live architecture score.
- `content/system-prompt/` holds markdown prompt sections stitched at runtime.

### Token Control
- **Domain-filtered system prompt** (`select-domains.ts`): a keyword→domain map with word-boundary regex loads only relevant prompt sections (~6K tokens instead of ~10K).
- History is truncated to the last 20 messages, since the system prompt carries persistent design state.

### Configuration
Server-only runtime config in `nuxt.config.ts`. Env vars auto-map with the `NUXT_` prefix:
- `NUXT_RETRIEVAL_API_HOST` — FastAPI URL
- `NUXT_AI_PROVIDER` — `ollama` or `anthropic`
- `NUXT_OLLAMA_BASE_URL` — Ollama URL
- `NUXT_CHAT_MODEL`, `NUXT_LLM_XS_MODEL` — chat model and small (title/reformulation) model
- `NUXT_ANTHROPIC_API_KEY` — for Anthropic in production
- `NUXT_DATABASE_URL` — Postgres (Drizzle)
- `NUXT_SESSION_PASSWORD`, GitHub OAuth client ID/secret — for auth

## LLMs

Models are configurable per environment (Ollama for dev, Anthropic for prod):

| Task | Ollama | Anthropic |
|:--|:--|:--|
| Embedding | `nomic-embed-text` | — |
| Chunk tagging | `gemma3:4b` | — |
| Chat | `gemma3:4b` | Sonnet 4.x |
| Title generation | `gemma3:270m` | Haiku 4.5 |
| Query reformulation | `gemma3:270m` | Haiku 4.5 |

`gemma3:4b` handles RAG + citations locally, but struggles to follow the full system prompt + tools — production runs on Anthropic.

## CI

GitHub Actions workflow (`.github/workflows/unit-tests.yaml`) runs on pushes to `main`/`feat/*` and PRs (`paths-ignore: **.md`). A `changes` job (`dorny/paths-filter`) gates four conditional jobs so only affected packages test: web-scraper (vitest), rag-pipeline (pytest), retrieval-api (pytest), advisor-ui (vitest + a `nuxt build` smoke test).
