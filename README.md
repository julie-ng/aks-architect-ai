# AKS Architect AI

Prototype and Capstone Project for AI Engineering Bootcamp.

## Use Case

A customer who is new to Kubernetes and/or Azure wants to deploy an AKS cluster but needs help defining an architecture. This AI application combines RAG of official documents with human curation to advise the user:

- [X] Chatbot interface to answer questions - uses RAG of official docs.
- [ ] Interactive UI with questions for user to determine fundamental requirements, i.e. compliant industry vs startup, etc.
- [ ] Architectural Decisions for specific components made by AI Agents.

## Components

This is a monorepo with many moving parts.

| Directory | Component | Description |
|:--|:--|:--|
| [`advisor-api/`](./advisor-api) | Retrieval Backend | Python [FastAPI](https://fastapi.tiangolo.com/) backend with `/api/retrieve` endpoint for RAG queries. |
| [`advisor-ui/`](./advisor-ui) | UI | NuxtJS app with streaming chat, which calls FastAPI endpoints |
| [`rag-pipeline/`](./rag-pipeline) | RAG Pipeline | Code to convert scraped docs into embeddings |
| [`web-scraper/`](./web-scraper) | Crawler | [Crawlee](https://github.com/apify/crawlee) JS Library for scraping web |
| [Qdrant](./docker-compose.dev.yaml) | Vector DB | Where embeddings are saved | 
| [Ollama](https://ollama.com/) | LLM | Local LLM for testing purposes. |

## Commands

See [Makefile](./Makefile) for all commands.

### Scraping AKS Documentation

Configure which web pages are crawled in [`SOURCES.yaml`](./web-scraper/SOURCES.yaml)

```bash
# Clear old cache
make scraper/clean

# Run new crawl
make scraper/crawl
```

Then re-run RAG Pipeline (chunking, embeddings)

```bash
make rag-pipeline
```

And you cam test it worked with `make pipeline/query` and/or the Qdrant Dashboard at [localhost:6333/dashboard](http://localhost:6333/dashboard) 

### Start Dev Environment

#### Step 1 - Start Ollama

Pull Ollama models and start service.

```bash
make ollama/pull
make ollama/start
```

Check if it's running with `pgrep -l ollama` or open [localhost:11434](http://localhost:11434)

#### Step 2 - Start Qdrant DB and Python Backend

```bash
docker-compose -f docker-compose.dev.yaml up
```

Todo: consider adding Nuxt JS to compose file, depending on performance with HMR.

#### Step 3 - Start Frontend UI

```bash
cd advisor-ui && npm run dev
```

Finally open [http://localhost:3000](http://localhost:3000) and use the chat interface.

---

## LLMs

Models used:

| Provider | Model | Environment | Purpose |
|:--|:--|:--|:--|
| Ollama | `nomic-embed-text` | Local | Embedding |
| Ollama | `gemma3:1b` | Local | Chat |
| Azure Open AI | TBD | Test | Embedding |
| Azure Open AI | TBD | Test | Chat |
