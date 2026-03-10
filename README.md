# AKS Architect AI

Experimenting with RAG Pipelines for AKS docs to create an AI Advisor.

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

- [x] 1. Prerequisites (one-time setup, ~5 min)**
```bash
ollama pull nomic-embed-text      # download the embedding model
docker compose -f docker-compose.dev.yaml up -d  # start Qdrant
```

- [x] **2. `embed.py`** — the main missing piece
- Read `chunks.jsonl`
- For each chunk, call Ollama to get a vector (`nomic-embed-text` outputs 768 dimensions)
- Create a Qdrant collection (if it doesn't exist) sized for 768-dim vectors
- Upsert vectors + all chunk metadata as the Qdrant payload
- Should batch upserts (e.g. 50 at a time) for speed

- [ ] **3. `query.py`** — smoke test / validation
- Takes a question string as input
- Embeds it with the same model
- Searches Qdrant for top-k nearest chunks
- Prints results with title, URL, and text snippet

Once `query.py` returns sensible results for AKS questions, the data pipeline is done and you can move on to the advisor/chat layer.

In order: run `chunk.py` → write `embed.py` → write `query.py` → verify results. Good night!
