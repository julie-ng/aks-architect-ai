# Task: Phase 2 — Pipeline storage backend (local disk → S3)

Self-contained brief for a fresh Claude Code session (worktree-friendly). Part of the
AWS demo deployment epic. Prereq for Phase 3 (Temporal, by-reference S3 hand-off).

## Goal

Let the RAG pipeline scripts (`chunk.py`, `tag.py`, `embed.py`) read/write their JSONL
artifacts from **either local disk or S3**, selected by a `STORAGE_BACKEND` config flag.
Local stays the default so dev/tests are unaffected; S3 is the path used in the deployed
(Lambda) pipeline.

Keep the software structure intact — swap only the I/O seam. This is a "lift the file
open() behind an interface" change, not a rewrite.

## Scope

**In scope**
- `chunk.py`, `tag.py`, `embed.py` read/write via a new storage abstraction.
- Optionally `web-scraper` output → S3 as well (see "Crawler" below — low effort, ~few min run).
- `config.py` gains storage settings (env-overridable, defaults local).

**Out of scope**
- Temporal / any sharding (Phase 3). Write ONE `chunks.jsonl`, not `chunks/000.json…`.
- **Any `infrastructure/` (terraform) change.** The real bucket is CDK-owned (Phase 4);
  test against a hand-made bucket. TF/IAM already reference the bucket by name.
- Lambda packaging / CDK (Phase 4).
- retrieval-api (separate track).

## Decisions (resolved — do not re-litigate)

1. **No sharding in Phase 2.** Write single files: `chunks.jsonl`, `tagged_chunks.jsonl`.
   The per-chunk sharding (`<runId>/chunks/000.json…`) is a Phase-3 Temporal `split`
   activity, NOT this task. (Resolves a contradiction between two notes in the epic memory.)

2. **Per-run S3 layout** (runId namespaces a whole pipeline run):
   ```
   s3://<bucket>/<runId>/sources/*.json        # crawler output (if crawler in scope)
   s3://<bucket>/<runId>/chunks.jsonl          # chunk.py output → tag.py input
   s3://<bucket>/<runId>/tagged_chunks.jsonl   # tag.py output   → embed.py input
   ```
   `runId` = sortable UTC timestamp, e.g. `20260717T104530Z`.

3. **Storage abstraction = a small `helpers/storage.py` module**, one interface, two backends
   (`local`, `s3`). The three scripts read/write through it instead of calling
   `Path.open()` / `read_text()` directly. Suggested minimal surface:
   ```python
   # helpers/storage.py
   def read_text(key: str) -> str: ...          # local: read file; s3: get_object
   def write_text(key: str, data: str) -> None: ...
   def read_json_lines(key: str) -> Iterator[dict]: ...   # convenience for .jsonl
   def write_json_lines(key: str, rows: Iterable[dict]) -> None: ...
   def list_keys(prefix: str) -> list[str]: ...  # for chunk.py reading the crawler dataset dir
   ```
   - Backend chosen by `cfg.storage_backend`. Boto3 client lazy-created (like `tag.py`'s
     `_bedrock_client`) so local-only runs need no AWS creds.
   - A "key" is a plain relative path (`<runId>/chunks.jsonl`). Local backend roots keys under
     a base dir (default `.`); S3 backend prefixes with the bucket. Same key string works for both.
   - Keep it tiny — no fancy fsspec dependency; boto3 is already a dep.

4. **`runId` is passed via env var for local dev/testing** (`PIPELINE_RUN_ID`). If unset:
   local backend can default to `.` (current behavior — bare `chunks.jsonl`); S3 backend must
   require it (error if missing — refuse to write to a null run). Lambda propagation is a
   Phase-3/4 concern; do NOT design that system now.

5. **Bucket ownership:**
   - **Real bucket `skai-pipeline-store`** — **CDK-owned** (Phase 4), alongside the Lambdas.
     The pipeline owns the bucket 100%; TF/`iam/` only *reference* it by name (bucket-wide
     policies already in place — name-as-contract). Phase 2 does NOT add the bucket to
     terraform and does NOT touch `infrastructure/` at all.
   - **Test bucket** — CDK doesn't exist yet, so for local S3 testing now use a throwaway
     unique name (`aws s3 mb s3://<your-unique-name>`), passed via `S3_BUCKET` env. Tear down
     freely. (A unique name also sidesteps S3's global-namespace `OperationAborted` on
     delete-then-immediate-recreate.)

## Config additions (`rag-pipeline/config.py`)

Follow the existing env-wins-over-default pattern (see `.claude/rules/configuration.md`).
Add to the frozen `Config` dataclass + both `config_defaults` and `config`:

| field             | env var             | default   | notes |
|-------------------|---------------------|-----------|-------|
| `storage_backend` | `STORAGE_BACKEND`   | `local`   | `local` \| `s3` |
| `s3_bucket`       | `S3_BUCKET`         | `""`      | required when backend=s3 |
| `pipeline_run_id` | `PIPELINE_RUN_ID`   | `""`      | UTC timestamp; required for s3 writes |
| `storage_base_dir`| `STORAGE_BASE_DIR`  | `.`       | local backend root |

Mirror these in `.env.sample` under the RAG Pipeline block.

## Script changes

Each script currently uses `argparse` `--input`/`--output`/`--dataset` with `Path`. Preserve
the CLI ergonomics but route the actual read/write through `helpers/storage.py`:

- **`chunk.py`** — reads the crawler dataset dir (`list_keys` + `read_text` per file), writes
  `chunks.jsonl`. Local input path stays `../web-scraper/storage/datasets/aks-docs` unless
  crawler-to-S3 is done (then read `<runId>/sources/`).
- **`tag.py`** — read `chunks.jsonl`, write `tagged_chunks.jsonl` via storage. (Tagging/caching
  logic unchanged — only the file I/O at the top/bottom of `main()`.)
- **`embed.py`** — read `tagged_chunks.jsonl` via storage. DB writes are unchanged (Postgres,
  not S3). Keep the HNSW drop-before/rebuild-after logic exactly as-is.

Keys are built from `runId`: `f"{cfg.pipeline_run_id}/chunks.jsonl"` etc. When backend=local
and no runId, fall back to the bare filename so existing `make pipeline/*` targets keep working.

## Crawler (optional, low effort)

The crawler (`web-scraper`) writes ~143 JSON files to `storage/datasets/aks-docs/` and a run
takes only a few minutes. Two options — pick based on appetite:
- **(a) In scope:** have the crawler (or a tiny sync step) also write to `<runId>/sources/*.json`
  in S3, so chunk.py can read from S3 end-to-end.
- **(b) Manual:** leave the crawler local; manually `aws s3 cp` the dataset up to
  `<runId>/sources/` when testing the S3 path. Fine for the demo.
Default recommendation: (b) for this task (keeps scope tight); do (a) properly in Phase 4 when
the crawler becomes `skai-crawlee-fn`.

## Verification

- `make pipeline/chunk|tag|embed` still work unchanged with `STORAGE_BACKEND=local` (default).
- With `STORAGE_BACKEND=s3 S3_BUCKET=<test> PIPELINE_RUN_ID=<ts>`: chunk → tag → embed round-trips
  through S3, and `embed.py` still lands 1024-dim vectors in RDS.
- No AWS creds required for a pure local run (lazy boto3 client).
- Existing pytest suite (`make pipeline/test`) stays green; add unit tests for `helpers/storage.py`
  (local backend at least; S3 can be moto-mocked if desired).

## Gotchas carried from earlier work

- Bedrock Nova needs the `eu.amazon.nova-micro-v1:0` inference-profile id, not the bare id
  (already handled in config; don't regress).
- `config.py` env vars WIN over defaults — a stale exported `STORAGE_BACKEND`/`S3_BUCKET` in the
  shell will clobber intent. Re-source `.env` after editing.
- AWS auth locally = `AWS_PROFILE=process` (a `credential_process` profile; SSO session expires —
  re-auth via the user's own flow, not `aws sso login`).
