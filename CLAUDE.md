# AKS Architect

AI-assisted architecture advisor for Azure Kubernetes Service (AKS). Early stage — currently building the data pipeline.

## Project Structure

```
web-scraper/          # Crawlee-based scraper for Microsoft Learn docs
  src/
    main.ts           # Entry point — loads sources, runs crawler
    crawler.ts        # CheerioCrawler: HTML extraction → Markdown via Turndown
    types.ts          # Source, SourcesConfig, PageResult interfaces
    utils/
      load-sources.ts       # Parses SOURCES.yaml
      get-seed-urls.ts      # Extracts seed URLs from sources
      get-allowed-globs.ts  # Extracts URL glob patterns for link following
      match-source.ts       # Maps a crawled URL back to its source config
      auto-detect-doc-type.ts  # Infers doc_type tag from URL path patterns
  SOURCES.yaml        # Defines crawl sources (seed URLs, globs, priority, tags)
  storage/            # Crawlee runtime data (gitignored)
    datasets/aks-docs/   # Crawled output: one JSON file per page
    request_queues/      # Crawlee's deduplication queue
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
3. Content extraction targets `main div.content` to skip page chrome (article headers, metadata, outlines)
4. Noise elements are stripped before Turndown conversion (feedback sections, breadcrumbs, AI summaries, etc.)
5. Each page is saved as a JSON record with: url, title, description, markdown, source_name, priority, tags, crawled_at
6. Rate-limited: 3 concurrent requests, 40 req/min

### Content Extraction — Noise Removal
The Microsoft Learn page structure puts article content inside `main div.content`. Elements removed before markdown conversion:
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
- **Language:** Python 3
- **Vector DB:** [Qdrant](https://qdrant.tech/) — local via Docker, upgrade path to Qdrant Cloud on Azure
- **Embeddings (local):** `nomic-embed-text` via [Ollama](https://ollama.com/)
- **Embeddings (production):** Azure OpenAI (requires re-embedding on deploy)

### Project Structure
```
rag-pipeline/
  chunk.py          # Read crawler JSON → chunk markdown → output chunks.jsonl
  pyproject.toml    # uv project config + dependencies
docker-compose.dev.yaml # Qdrant container (project root)
```

### Key Commands
```bash
# Start Qdrant (dashboard at http://localhost:6333/dashboard)
docker compose up -f docker-compose.dev.yaml -d

# Install Python deps
cd rag-pipeline
uv sync

# Chunk crawled docs
uv run python chunk.py
# Options: --dataset <path>  --output <path>
```

### Pipeline Stages
1. **Chunk** (`chunk.py`) — splits markdown on `##`/`###`/`####` headings, merges tiny fragments, further splits oversized sections on paragraph breaks. Outputs `chunks.jsonl` (one JSON object per line).
2. **Embed** _(not yet built)_ — reads `chunks.jsonl`, calls Ollama/nomic-embed-text, upserts vectors into Qdrant
3. **Query** _(not yet built)_ — takes a user question, embeds it, retrieves top-k chunks from Qdrant

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

### Chunking Tunables
Defined at the top of `chunk.py`:
- `MAX_CHARS = 1500` — max chunk size (~300–400 tokens, safe for nomic-embed-text's 2048 token limit)
- `MIN_CHARS = 100` — minimum size; smaller fragments are merged or discarded
