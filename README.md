# AKS Architect AI

Prototype and Capstone Project for AI Engineering Bootcamp.

## Use Case

A customer who is new to Kubernetes and/or Azure wants to deploy an AKS cluster but needs help defining an architecture. This AI application combines RAG of official documents with human curation to advise the user:

- [X] Chatbot interface to answer questions - uses RAG of official docs.
- [ ] Interactive UI with questions for user to determine fundamental requirements, i.e. compliant industry vs startup, etc.
  - [x] Separate form UI
  - [ ] UI integrated into chat
- [ ] Architectural Decisions for specific components made by AI Agents.

## Components

This is a monorepo with many moving parts.

| Directory | Component | Description |
|:--|:--|:--|
| [`retrieval-api/`](./retrieval-api) | Retrieval Backend | Python [FastAPI](https://fastapi.tiangolo.com/) backend with `/api/retrieve` endpoint for RAG queries. |
| [`advisor-ui/`](./advisor-ui) | UI | NuxtJS app with streaming chat, which calls FastAPI endpoints |
| [`rag-pipeline/`](./rag-pipeline) | RAG Pipeline | Code to convert scraped docs into embeddings |
| [`web-scraper/`](./web-scraper) | Crawler | [Crawlee](https://github.com/apify/crawlee) JS Library for scraping web |
| [Postgres + pgvector](./docker-compose.dev.yaml) | Database | Vector search + chat session storage |
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

And you can test it worked with `make pipeline/query`.

### Start Dev Environment

#### Step 1 - Start Ollama

Pull Ollama models and start service.

```bash
make ollama/pull
make ollama/start
```

Check if it's running with `pgrep -l ollama` or open [localhost:11434](http://localhost:11434)

#### Step 2 - Start Containers

This command starts up Postgres, Python `retrieval-api` backend and Nuxt.js `advisor-ui` frontend.

```bash
docker-compose -f docker-compose.dev.yaml up --build
```

Finally open [http://localhost:3000](http://localhost:3000) and use the chat interface.

---

## LLMs

Models used:

| Provider | Model | Environment | Purpose |
|:--|:--|:--|:--|
| Ollama | `nomic-embed-text` | Local | Embedding |
| Ollama | `gemma3:4b` | Local | Chat, title generation,  query reformulation |
| Anthropic | Sonnet 4.6 | Test | Chat LLM |
| Anthropic | Haiku 4.5 | Test | Title generation |

## Architecture Diagram

- Last updated 21 March
- Diagram provides some high level overview - unfortunately too complex for Mermaid.
- Models are configurable for different environemnts, e.g. dev vs prod.

```mermaid
---
config:
  theme: base
  flowchart:
    curve: stepAfter
    padding: 20    
    rankSpacing: 50
  themeVariables:
    primaryColor: "#f1f5f9"
    primaryTextColor: "#1e293b"
    primaryBorderColor: "#94a3b8"
    lineColor: "#64748b"
    secondaryColor: "#f8fafc"
    tertiaryColor: "#f1f5f9"
    background: "#ffffff"
    mainBkg: "#f1f5f9"
    nodeBorder: "#94a3b8"
    clusterBkg: "#f8fafc"
    clusterBorder: "#cbd5e1"
    titleColor: "#0f172a"
    edgeLabelBackground: "#ffffff"
---
graph TB
    subgraph pipeline["Data Pipeline (one-time)"]
        direction LR
        MS[("Microsoft Learn\ndocs")]
        WS["Web Scraper\nNode.js / Crawlee"]
        CP["chunk.py\nMarkdown chunker"]
        EP["embed.py\nBatch embedder"]
        OL_E{{"Embedding Model\nnomic-embed-text"}}
        PG[("Postgres + pgvector\n:5432")]

        MS -->|crawl| WS
        WS -->|"storage/*.json"| CP
        CP -->|chunks.jsonl| EP
        EP -->|"search_document: prefix"| OL_E
        OL_E -->|768-dim vectors| PG
    end

    subgraph models["LLM Models"]
        EMBED{{"Embedding Model\nnomic-embed-text"}}
        CHAT{{"Chat Model\ngemma3:4b"}}        
    end

    subgraph ui["advisor-ui :3000"]
        BR["@ai-sdk/vue"]
        NR["Nuxt Server Route\nPOST /api/chat"]
        TG["Title Generator\nPOST /api/chat/title"]
    end

    subgraph api["retrieval-api :8000"]
        RF["reformulation.py"]
        RV["retrieval.py"]
    end

    BR -->|"messages + history"| NR
    BR -->|"first message"| TG
    TG -->|"generate title"| CHAT
    NR -->|"POST /api/retrieve"| RF
    RF -->|rewrite query| CHAT
    RF --> RV
    RV -->|"search_query: prefix"| EMBED
    EMBED -->|vector| PG
    PG -->|"top-K chunks"| RV
    RV -->|RetrieveResponse| NR
    NR -->|"prompt + chunks + history"| CHAT
    NR -->|"save messages"| PG
    CHAT -->|token stream| BR


    %% ── Microsoft Learn ── Azure blue
    classDef azure fill:#0078D4,stroke:#005A9E,color:#ffffff,stroke-width:2px
    class MS azure

    %% ── Pipeline data nodes ── sky-100
    classDef pipeline fill:#dff2ff,stroke:#00A6F4,color:#0c4a6e,stroke-width:1.5px
    class WS,CP,EP pipeline

    %% ── Databases ── orange
    classDef db fill:#FF8903,stroke:#F64A00,color:#ffffff,stroke-width:2px
    class PG db

    %% ── Python services ── yellow
    classDef python fill:#FFDF22,stroke:#F0B100,color:#1e293b,stroke-width:2px
    class RF,RV python

    %% ── Web / UI layer ── teal-400
    classDef web fill:#2dd4bf,stroke:#0d9488,color:#042f2e,stroke-width:1.5px
    class BR,NR,TG web

    %% ── LLMs & models ── indigo-500
    classDef llm fill:#6366f1,stroke:#4338ca,color:#ffffff,stroke-width:1.5px
    class OL_E,EMBED,CHAT llm
```

---

## Misc.

Model Pricing for personal reference.

- [Anthropic Model Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Vercel AI Models Pricing](https://vercel.com/ai-gateway/models)
- [MSFT Foundry Pricing for Anthropic](https://marketplace.microsoft.com/en-us/product/anthropic.anthropic-claude-sonnet-4-6-offer?tab=Overview) - pricing is buried in Foundry portal
