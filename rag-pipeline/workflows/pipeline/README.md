# `PipelineWorkflow`

Chains the three stage workflows under one `run_id`, passing each stage's output count to the next.

See [`workflow.py`](./workflow.py)

## Type

Parent workflow

## Inputs

- `run_id` (str)

## Outputs

- Returns: `{ chunk_count, tag: {...}, embed: {...}, run_id }`
- Side effects are produced by the child workflows (S3 shards + Postgres load).

## Activities

None directly — orchestration only. Runs three child workflows in sequence:

| Child Workflow | Description |
|:--|:--|
| [`ChunkWorkflow`](./../chunk/README.md) | Sources → chunk shards |
| [`TaggingWorkflow`](./../tag/README.md) | Chunk shards → tagged shards (Nova) |
| [`EmbedWorkflow`](./../embed/README.md) | Tagged shards → vectors → Postgres (Titan + load) |
