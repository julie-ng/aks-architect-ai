DC = docker compose -f docker-compose.dev.yaml

rag-pipeline: pipeline/chunk pipeline/embed
rag-pipeline/full: scrape pipeline/chunk pipeline/embed
unit-tests: scraper/test pipeline/test advisor-api/test

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

pipeline/embed:
	cd rag-pipeline && uv run python embed.py

pipeline/query:
	@test -n "$(Q)" || (echo "Usage: make pipeline/query Q=\"your question\"" && exit 1)
	cd rag-pipeline && uv run python query.py "$(Q)"

# --- Advisor API ---

advisor-api/test:
	cd advisor-api && uv run pytest

# --- Advisor UI ---

advisor-ui/dev:
	cd advisor-ui && npm run dev

advisor-ui/install:
	cd advisor-ui && npm install

# --- Lint ---

lint: advisor-ui/lint advisor-api/lint pipeline/lint

advisor-ui/lint:
	cd advisor-ui && npm run lint

advisor-api/lint:
	cd advisor-api && uv run ruff check . && uv run ruff format --check .

pipeline/lint:
	cd rag-pipeline && uv run ruff check . && uv run ruff format --check .

# --- Ollama ---

ollama/start:
	ollama serve

ollama/pull:
	ollama pull nomic-embed-text
	ollama pull llama3.2

# --- Docker Compose ---

dc/up:
	$(DC) up -d

dc/down:
	$(DC) down

dc/build:
	$(DC) up -d --build

.PHONY: rag-pipeline rag-pipeline/full unit-tests \
	scraper/test scraper/clean scraper/crawl \
	pipeline/test pipeline/chunk pipeline/embed pipeline/query \
	advisor-api/test \
	lint advisor-ui/lint advisor-api/lint pipeline/lint \
	advisor-ui/dev advisor-ui/install \
	ollama/start ollama/pull \
	dc/up dc/down dc/build
