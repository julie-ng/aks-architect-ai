# Deployment Architecture — AWS + Vercel (Demo)

Deployment topology for the hosted demo. Decisions locked 2026-07-16.

- **Vercel:** `advisor-ui` (Nuxt) only.
- **AWS App Runner:** `retrieval-api` (FastAPI, existing Dockerfile).
- **AWS:** Aurora Serverless v2 (pgvector, public VPC) + Bedrock Titan Embeddings V2 + Temporal-invoked Lambda RAG pipeline.

## 1. RAG Pipeline (offline)

Runs only on crawl. Temporal.io-orchestrated Lambdas hand off via S3, then `embed.py` writes vectors to the shared store.

```mermaid
flowchart LR
  msft([MSFT Docs<br/>curated])

  subgraph pipeline["RAG Pipeline — Temporal.io · Lambda"]
    direction LR
    crawl["Crawlee"] -->|"*.json"| chunk["chunk.py"] -->|"*.jsonl"| embed["embed.py"]
    s3[("S3 · hand-off")]
  end

  subgraph shared["Shared"]
    direction TB
    bedrock["Bedrock<br/>Titan Text Embeddings V2 · 1024-dim"]
    db[("Aurora Serverless v2<br/>Postgres + pgvector")]
  end

  crawl -->|scrape| msft
  embed -->|"search_document"| bedrock
  embed -->|"1024-dim vectors"| db

  classDef awsBox fill:#ff9900,color:#000,stroke:#232f3e;
  classDef storageBox fill:#e91e63,color:#fff,stroke:#880e4f;
  classDef aiBox fill:#1e88e5,color:#fff,stroke:#0d47a1;
  class crawl,chunk,embed awsBox;
  class s3,db storageBox;
  class bedrock aiBox;
  style shared fill:#f0f0f0,stroke:#bdbdbd,color:#000;
```

## 2. Runtime components (online)

Per-request chat flow. advisor-ui on Vercel, retrieval-api on AWS App Runner, both reading the shared store + embedding model.

```mermaid
flowchart LR
  user([User / Browser])
  gh([GitHub OAuth<br/>Identity Provider])

  subgraph vercel["▲ Vercel"]
    ui["advisor-ui (Nuxt)<br/>POST /api/chat · /api/chat/title<br/>streams tokens · scales to zero"]
    gateway["AI Gateway<br/>Anthropic · claude-sonnet / claude-haiku"]
  end

  subgraph aws["AWS · App Runner"]
    retrieval["retrieval-api (FastAPI)<br/>POST /api/retrieve · /healthz<br/>Dockerfile · IAM instance role"]
  end

  subgraph shared["Shared — Bedrock"]
    direction TB
    bedrock["Titan Text Embeddings V2 · 1024-dim<br/>(embeddings)"]
    nova["Nova Micro<br/>(reformulation)"]
    db[("Aurora Serverless v2<br/>Postgres + pgvector")]
  end

  user -->|HTTPS| ui
  ui -->|login| gh
  ui -->|"token stream"| gateway
  ui -->|"fetch sources (retrieve)"| retrieval
  ui -->|"users · messages · designs (Drizzle)"| db
  retrieval -->|"embed question"| bedrock
  retrieval -->|reformulation| nova
  retrieval -->|"top-k vector search"| db

  classDef vercelBox fill:#000,color:#fff,stroke:#fff;
  classDef awsBox fill:#ff9900,color:#000,stroke:#232f3e;
  class ui,gateway vercelBox;
  class retrieval,bedrock,nova,db awsBox;
```

## Notes / rationale

- **advisor-ui on Vercel** — stateless, streams over one HTTP POST (no WebSockets), free HTTPS, scales to zero. Secrets (Postgres URL, GitHub OAuth, session password) as Vercel env vars.
- **Chat LLM via Vercel AI Gateway** — Anthropic (claude-sonnet / claude-haiku) routed through Vercel's AI Gateway for cost control + observability, not direct-to-Anthropic. This is the only Anthropic usage in the system.
- **retrieval-api on App Runner** — right abstraction for one stateless HTTP container: runs the existing Dockerfile as-is (no ASGI adapter, no ALB, no ECS cluster/task-defs), built-in free HTTPS + autoscaling, **IAM instance role** for Bedrock (no stored AWS keys). Keeps min-1 instance warm → does not scale to zero; its persistent psycopg pool keeps Aurora warm too (accepted for a demo).
- **Aurora Serverless v2 (pgvector), public VPC** — deliberately public (not VPC-private) because advisor-ui on Vercel must reach it. Public VPC also avoids NAT Gateway (~$32/mo) and ALB (~$16/mo). Region co-located with App Runner + Bedrock.
- **retrieval-api is 100% Bedrock** — **Titan Text Embeddings V2 @ 1024-dim** for embeddings (replaces local Ollama `nomic-embed-text` @ 768; requires re-embedding + dropping nomic prefixes) and **Nova Micro** (`amazon.nova-micro-v1:0`) for query reformulation (moved off Anthropic — cheapest Bedrock text model, fractions of a cent at demo volume, same InvokeModel/IAM/region as embeddings → one auth story, no Anthropic key in retrieval-api).
- **RAG pipeline** — Crawlee / chunk / embed as Temporal.io-invoked Lambdas, S3 hand-off between stages, scales to zero (runs only on crawl).
- **Cost** — ~$20–25/mo for the AWS data plane (App Runner warm + Aurora warm + Bedrock pennies + IPv4); advisor-ui free-tier on Vercel.
