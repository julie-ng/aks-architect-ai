# `ChunkWorkflow`

Reads the crawled source documents from S3 and splits them into chunk shards. Deterministic (no LLM) — pure markdown-by-headings splitting.

See [`workflow.py`](./workflow.py)

## Type

Child to `PipelineWorkflow`

## Inputs

- `run_id` (str)
- S3 `sources/*.json` (crawler output)

## Outputs

- S3 `<run_id>/chunks/NNNN.json` (one shard per chunk)
- S3 `<run_id>/manifest.json` (chunk count)
- Returns: `chunk_count` (int)

## Activities

| Activity | Queue | Description |
|:--|:--|:--|
| [`chunk_documents`](./activities/chunk_documents.py) | `default` | Read S3 sources, chunk them, write shards + manifest (parallel S3 I/O) |
