DC = docker compose -f docker-compose.dev.yaml

rag-pipeline: pipeline/chunk pipeline/tag pipeline/embed
rag-pipeline/full: scrape pipeline/chunk pipeline/tag pipeline/embed
unit-tests: scraper/test pipeline/test retrieval-api/test

# --- Web Scraper ---

scraper/test:
	cd web-scraper && npm test

scraper/clean:
	cd web-scraper && npm run clean

scraper/crawl:
	cd web-scraper && npm run crawl

# --- RAG Pipeline ---

pipeline/test:
	cd rag-pipeline && uv run pytest

pipeline/chunk:
	cd rag-pipeline && uv run python chunk.py

pipeline/tag:
	cd rag-pipeline && uv run python tag.py

pipeline/tag-sample:
	cd rag-pipeline && head -15 chunks.jsonl > sample_chunks.jsonl && uv run python tag.py --input sample_chunks.jsonl --output sample_tagged.jsonl

pipeline/embed:
	cd rag-pipeline && uv run python embed.py

pipeline/query:
	@test -n "$(Q)" || (echo "Usage: make pipeline/query Q=\"your question\"" && exit 1)
	cd rag-pipeline && uv run python query.py "$(Q)"

# --- Retrieval API ---

retrieval-api/test:
	cd retrieval-api && uv run pytest

# --- Advisor UI ---

advisor-ui/dev:
	cd advisor-ui && npm run dev

advisor-ui/install:
	cd advisor-ui && npm install

# --- Lint ---

lint: advisor-ui/lint retrieval-api/lint pipeline/lint

advisor-ui/lint:
	cd advisor-ui && npm run lint

retrieval-api/lint:
	cd retrieval-api && uv run ruff check . && uv run ruff format --check .

pipeline/lint:
	cd rag-pipeline && uv run ruff check . && uv run ruff format --check .

# --- Ollama ---

ollama/start:
	ollama serve

ollama/pull:
	ollama pull nomic-embed-text
	ollama pull llama3.2

# --- Database ---

db/psql:
	$(DC) exec postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

# --- Docker Compose ---

dc/up:
	$(DC) up -d

dc/down:
	$(DC) down

dc/build:
	$(DC) up -d --build

.PHONY: rag-pipeline rag-pipeline/full unit-tests \
	scraper/test scraper/clean scraper/crawl \
	pipeline/test pipeline/chunk pipeline/tag pipeline/tag-sample pipeline/embed pipeline/query \
	retrieval-api/test \
	lint advisor-ui/lint retrieval-api/lint pipeline/lint \
	advisor-ui/dev advisor-ui/install \
	ollama/start ollama/pull \
	db/psql \
	dc/up dc/down dc/build
