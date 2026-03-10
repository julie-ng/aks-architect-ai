# AKS Architect AI

Experimenting with RAG Pipelines for AKS docs to create an AI Advisor.

## Crawler

### Key Commands
```bash
cd web-scraper
npm run crawl        # Run the crawler (tsx src/main.ts)
npm run clean        # Delete all storage/ data
npm run test         # Vitest run
npm run test:watch   # Vitest watch mode
```

## Rag Pipeline

## Commands

From the `./rag-pipeline/` directory

```bash
# create chunks.jsonl
uv run python chunk.py

# create embeddings and insert into Qdrant
uv run python embed.py

# Finally, run a query
uv run python query.py "How should I configure node pools for production AKS?"
```

### Ollama

Using `nomic-embed-text` for embedding

```bash
# check if already running
pgrep -l ollama 

# start server, then check http://localhost:11434
ollama serve

# run model
ollama run nomic-embed-text "text goes here"
```

### Qdrant

- [pypi.org > mcp-server-qdrant 0.6.0](https://pypi.org/project/mcp-server-qdrant/0.6.0/)
- [github > qdrant/mcp-server-qdrant](https://github.com/qdrant/mcp-server-qdrant)

#### Use Qdrant MCP server

Note: docs and AI say to use arguments, but syntax is oudated. Current versions expect environment variables.

```bash
# set environment variables
QDRANT_URL="http://localhost:6333"
COLLECTION_NAME="aks-docs"
EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"

# start server
uvx mcp-server-qdrant
```

---

## Todos

**Tuning the advisor**

- [ ] Score threshold and priority weighting in query.py — you'll want real queries to calibrate these
- [ ] Chunk overlap (repeating the last N chars of chunk N in chunk N+1) — helps when answers span section boundaries
