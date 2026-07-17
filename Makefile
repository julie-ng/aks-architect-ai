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
	cd rag-pipeline && head -5 chunks.jsonl > sample_chunks.jsonl && uv run python tag.py --input sample_chunks.jsonl --output sample_tagged.jsonl

pipeline/embed:
	cd rag-pipeline && uv run python embed.py

# One-time: upload the existing local crawler dataset to the run-independent S3
# `sources/` prefix that the Temporal ChunkWorkflow reads from. Sources are shared
# across runs (upload once, read many); re-run only after a fresh crawl. Reads
# S3_BUCKET / AWS_PROFILE / AWS_REGION from the environment (source .env first).
# Phase 4 replaces this with the crawler Lambda writing to the same prefix.
pipeline/upload-sources:
	@test -n "$(S3_BUCKET)" || (echo "S3_BUCKET not set (source .env)" && exit 1)
	aws --profile $(AWS_PROFILE) --region $(AWS_REGION) s3 cp \
		web-scraper/storage/datasets/aks-docs/ s3://$(S3_BUCKET)/sources/ \
		--recursive --exclude "*" --include "*.json"

# Build a SAMPLE subset of sources/ (first N objects) into sources-sample/ for fast
# pipeline iteration — run the whole chunk→tag→embed→load flow at ~10% scale instead of
# the full 143 docs / 3040 chunks. Then run with SOURCES_PREFIX=sources-sample.
# Usage: make pipeline/sample-sources        (default N=15, ~10% of 143)
#        make pipeline/sample-sources N=30
N ?= 15
pipeline/sample-sources:
	@test -n "$(S3_BUCKET)" || (echo "S3_BUCKET not set (source .env)" && exit 1)
	@echo "Copying first $(N) source objects → sources-sample/ ..."
	@aws --profile $(AWS_PROFILE) --region $(AWS_REGION) s3api list-objects-v2 \
		--bucket $(S3_BUCKET) --prefix sources/ --max-items $(N) \
		--query "Contents[].Key" --output text | tr '\t' '\n' | grep '\.json$$' | while read key; do \
			name=$$(basename "$$key"); \
			aws --profile $(AWS_PROFILE) --region $(AWS_REGION) s3 cp \
				s3://$(S3_BUCKET)/$$key s3://$(S3_BUCKET)/sources-sample/$$name --only-show-errors; \
		done
	@echo "Done. Run the pipeline with SOURCES_PREFIX=sources-sample"

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
