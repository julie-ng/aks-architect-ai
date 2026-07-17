# Task: Phase 3 — Temporalize the RAG pipeline

Self-contained brief (worktree-friendly). Part of the AWS demo deployment epic; builds on
Phase 2 (S3 storage backend, done).

## Goal

Orchestrate chunk → tag → embed with **Temporal**, running the dev server + workers **locally**
against **real AWS** (S3 artifacts, Bedrock Nova/Titan, RDS). Prove the logic + durability locally;
Phase 4 swaps hosting (worker → Lambda, dev server → Temporal Cloud) without touching the logic.

**Out of scope:** Lambda packaging, Temporal Cloud, CDK, crawler-as-Lambda (all Phase 4).

## Why (grounded in real failures — this is the pitch)

Three real failures on the 2026-07-16 sequential runs, each mapping to a design constraint:

| Incident | Cause | Temporal response |
|---|---|---|
| Nova `ValidationException` | bare model id (needs `eu.` profile) | **non-retryable** → fail fast |
| Nova throttling at chunk 2623/3040 (past boto3's ceiling = whole-run crash) | Bedrock rate limit | **retryable** + backoff + Semaphore to stay under the limit |
| embed `server closed connection` at ~1000/3040 | HNSW incremental maintenance saturated t4g.micro I/O → 116s checkpoint → socket timeout | **DROP→bulk-load→REBUILD**, single serialized writer |

Sequential baseline to beat: chunk+tag ≈ 36m, embed ≈ 17m, core ≈ 54m. Target at concurrency ≈15:
tagging ~3–4m, embed calls ~1–2m (DB write is an unchanged floor).

## Core Temporal rules

- **Workflow = deterministic orchestration, ZERO I/O.** All S3/Bedrock/Postgres/counting is in activities.
- **runId flows workflow → activity as an ARGUMENT, not env/global** — recorded in history so replay
  reconstructs identical calls, and avoids cross-run collision on a shared worker.
- **Shard count comes from an activity/manifest** (recorded in history), never live I/O in the workflow.
- **Bounded fan-out:** `asyncio.Semaphore(N≈10)` around `execute_activity`, gathered with `asyncio.gather`.
  Temporal's Python SDK gives a deterministic loop, so `gather`/`Semaphore` are safe.

## Error taxonomy + RetryPolicy (per-activity, by failure NATURE)

Bedrock errors classify via `ClientError.response["Error"]["Code"]` (`ThrottlingException` → retry;
`ValidationException` → non-retryable) or HTTP status (429 vs 400).

- **Bedrock activities (`tag_shard`, `embed_shard`) — repeated failure is transient** (throttle waves).
  `RetryPolicy(initial_interval=1s, backoff=2.0, maximum_interval=30s, maximum_attempts=8,
  non_retryable=["ValidationException"])`, `start_to_close_timeout=60s`. Spacing: 1,2,4,8,16,30,30s ≈ 90s.
  **The Semaphore is the primary knob, not the interval** — it prevents the wave; backoff handles the
  slip-through. Start N≈10, keep the policy as-is, and measure real retry behavior in the Temporal UI
  before tuning (wave duration is quota-specific, not knowable in advance). Jitter: omit until observed.
- **DB load (`load_vectors`) — repeated failure is structural** (I/O saturation, not transient).
  `maximum_attempts=2` (1 retry — ~free via idempotent reload; a 2nd buys nothing → fail loud/fast),
  `start_to_close_timeout≈10m`. Note: `maximum_attempts` counts the first attempt (2 = 1 retry).

## Partial-failure handling (early-abort)

A shard is FAILED only after exhausting its 8 attempts. Fan-out stages must be neither all-or-nothing
nor run-forever-then-tally:

- Count hard failures as `gather` results resolve. Threshold = **`max(20, ceil(2% of shard_count))`**
  (~61 for 3040; the floor of 20 protects small re-runs).
- On crossing it: **cancel remaining in-flight activities and fail the workflow immediately** — don't let
  the other ~2000 also exhaust retries (the "exponentially worse / more expensive" case, e.g. Bedrock down).
- Below it: proceed, report `N-k/N`, log failed indices for a targeted re-run.
- Why 2% not 10%: a hard failure is systemic throttle or an isolated broken chunk (<0.5%); a healthy run
  is ~0% hard failures, so 2%+ means something systemic — trip fast. Use `gather(return_exceptions=True)`.

## Resolved design decisions

**Workflow-per-stage** (over one flat workflow) — more glue, but each stage is independently retriable and
its own workflow in the UI. **Each child MUST be independently startable (dev AND prod)** — re-tag after a
taxonomy change without re-chunk, re-embed after a model swap without re-tag. The parent only chains them.

**Producer owns sharding** — the stage that produces an artifact writes fan-out-ready shards; the consumer
reads them directly. So there are **no `split_*`/`merge_*` activities** (a consumer re-downloading and
re-splitting the previous single file was a smell; the producer already holds the data in memory). The
single-file `chunks.jsonl`/`tagged_chunks.jsonl` remain only for the local CLI scripts.

**Task queues split by throttled RESOURCE, not by stage.** Activities default to their workflow's queue
unless routed explicitly, so per-queue throttling is a deliberate choice:

```
bedrock-queue   tag_shard, embed_shard   rate-limited under Nova/Titan TPS; high concurrency
db-queue        load_vectors             max_concurrent_activities = 1 → single-writer becomes
                                          enforced infrastructure, not a code comment
default         workflow tasks, chunk, read_sources, manifest   cheap/local, no throttle
```
Forward-looking: multiple scrape sources → per-source crawl queues with independent limits. Phase 3 =
these two queues + default.

**Embed write stays a single serialized `load_vectors`** (never fan out the INSERTs) — the Option A fix
below only works with one index-free writer.

## Workflow / activity tree

```
PipelineWorkflow(run_id)             parent — generates run_id once, chains children
│
├══ ChunkWorkflow(run_id)
│   ├─ read_sources(run_id)          <run_id>/sources/*.json (or crawler dataset locally)
│   └─ chunk(run_id)                 writes <run_id>/chunks/0000.json … + a count manifest
│
├══ TaggingWorkflow(run_id)          fan-out over chunk shards (bedrock-queue)
│   └─ tag_shard(run_id, i)          read chunks/{i}, Nova Converse (cached prefix), write tagged/{i}
│
└══ EmbedWorkflow(run_id)
    ├─ embed_shard(run_id, i)        fan-out, TITAN CALLS ONLY (bedrock-queue): write vectors/{i} to S3
    │                                (vectors ~12MB total → S3 by reference, not gather payloads)
    └─ load_vectors(run_id)          SINGLE serialized activity (db-queue), Option A:
                                       TRUNCATE → DROP INDEX → read vectors/*.json → batched INSERT
                                       → CREATE hnsw. Idempotent on retry (TRUNCATE + vectors in S3).
```

- **Chunk/crawl are single-activity** (CPU-bound, nothing to fan out).
- **1 S3 object per chunk** (3040 objects — nothing for S3; clean per-chunk retry isolation).
- **Retry blast-radius:** a fan-out activity's retry re-writes ONE shard, never 3040; single activities
  (chunk, load) redo whole-stage work but are deterministic/overwrite-safe. This is why their retry
  ceilings differ (chunk = cheap redo; load = fail-fast).

## Implementation notes

Activities lift existing code: `tag_shard` = `tag.py::_call_bedrock` + `helpers/tags.py::parse_tag_response`;
`embed_shard` = `helpers/embedding.py::embed_text`; `load_vectors` = the DROP/INSERT/REBUILD already in
`embed.py` (keep `HNSW_INDEX_NAME`/`CREATE_HNSW_SQL` synced with `db/init.sql`). All I/O routes through
`helpers/storage.py` (S3 backend, keys from the runId arg). Prompt caching compounds under fan-out — N
concurrent activities share the cached taxonomy prefix within the 5-min TTL.

**storage.py tweak:** `run_key(name)` reads `cfg.pipeline_run_id` (env) — right for the CLI, wrong for
Temporal (env is un-recorded I/O + collides across concurrent runs). Add `run_key(name, run_id=None)`:
explicit arg wins, else falls back to cfg. CLI scripts unchanged.

## Local dev + verification

- Temporal CLI dev server (`temporal server start-dev`); a local worker registers workflows + activities.
- Real AWS: `AWS_PROFILE=process`, `S3_BUCKET=skai-pipeline-store-test-f440010` (Phase-2 bucket), RDS via
  `DATABASE_URL`. Trigger a run with a fresh `run_id` (UTC timestamp).
- **End-to-end:** chunk → tag → embed lands 1024-dim vectors; `query.py` returns sensible results.
- **Durability demo:** kill the worker mid-tag; restart → resumes, only un-done activities re-run.
- **Throttle demo:** a throttled activity backs off/retries alone; the UI shows which retried.
- Capture the "after" wall-clock (baseline core ≈54m) and watch `cacheWriteInputTokens` for cold-cache
  write-amplification under fan-out (sequential baseline: `write ≈ 2.6K` ≈ one prefix, 85% cached).

## Gotchas carried forward

- No I/O in workflow code; get the shard count from an activity/manifest.
- Nova needs `eu.amazon.nova-micro-v1:0`; Titan uses the bare id. `config.py` env wins over defaults.
- AWS auth = `AWS_PROFILE=process` (credential_process; SSO expires — re-auth via the user's flow).
- Keep the embed DB write single-writer + index-free (Option A).

## Design review — human challenges that shaped this brief

Drafted with AI assistance, then revised through review. These points were raised during review and
each corrected or sharpened the draft; kept so the reasoning, not just the conclusions, is visible.

1. runId must pass workflow → activity, not read from env (determinism + no cross-run collision).
2. Sharding belongs to the producer, not the consumer — which removed the `split_*`/`merge_*` activities.
3. The HNSW drop/rebuild was under-specified; made it an explicit single serialized activity.
4. Bedrock vs DB failures are different *natures* (transient vs structural), not just codes → two RetryPolicies.
5. DB load gets 1 retry, not 2 — a repeat is structural; fail loud/fast.
6. Task queues as throttling boundaries; `db-queue` concurrency=1 makes single-writer enforced infrastructure.
7. Retry spacing / wave duration is quota-specific — measure in the UI; the Semaphore is the primary knob.
8. Fail-fast threshold, conservative: `max(20, 2%)` with cancel-on-trip, to avoid run-forever cost blowup.
9. Retry blast-radius asymmetry: a fan-out retry re-writes one shard, not the whole stage.
10. Child workflows must be independently startable in prod, not just dev.
11. Crawler stays out of scope for a risk reason (home-IP block against a live site), not just phasing.
