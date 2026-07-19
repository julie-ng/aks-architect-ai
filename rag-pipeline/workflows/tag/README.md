# `TaggingWorkflow`

Fans out one activity per chunk shard to tag it against the AKS design-framework taxonomy via Bedrock Nova. Bounded concurrency (`TEMPORAL_TAG_CONCURRENCY`, tuned to Nova's 400 RPM).

See [`workflow.py`](./workflow.py)

## Type

Child to `PipelineWorkflow`

## Inputs

- `run_id` (str), `count` (int — number of chunk shards)
- S3 `<run_id>/chunks/NNNN.json`

## Outputs

- S3 `<run_id>/tagged/NNNN.json` (one per shard)
- Returns: summary `{ tagged, failed, total }`

## Activities

| Activity | Queue | Description |
|:--|:--|:--|
| [`tag_shard`](./activities/tag_shard.py) | `bedrock-queue` | Read a chunk shard, tag it via Nova, write the tagged shard |
