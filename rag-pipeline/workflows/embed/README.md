# `EmbedWorkflow`

Fans out one activity per tagged shard to embed it via Bedrock Titan, then runs a single serialized activity to bulk-load all vectors into Postgres/pgvector.

See [`workflow.py`](./workflow.py)

## Type

Child to `PipelineWorkflow`

## Inputs

- `run_id` (str), `count` (int — number of tagged shards)
- S3 `<run_id>/tagged/NNNN.json`

## Outputs

- S3 `<run_id>/vectors/NNNN.json` (one per shard)
- Postgres `chunks` table (vectors + metadata, HNSW index rebuilt)
- Returns: summary `{ embedded, inserted }`

## Activities

| Activity | Queue | Description |
|:--|:--|:--|
| [`embed_shard`](./activities/embed_shard.py) | `bedrock-queue` | Read a tagged shard, embed via Titan, write the vector shard |
| [`load_vectors`](./activities/load_vectors.py) | `db-queue` | Single writer: TRUNCATE → DROP HNSW → bulk COPY → REBUILD HNSW |


# `LoadVectorsWorkflow`

Runs only the `load_vectors` step against existing S3 vectors — no fan-out, no re-embedding. For recovering from a DB bottleneck without paying to re-embed.

See [`load_vectors_workflow.py`](./load_vectors_workflow.py)

## Type

Standalone (started directly, not by `PipelineWorkflow`)

## Inputs

- `run_id` (str)
- S3 `<run_id>/vectors/NNNN.json` (from a prior embed run)
- S3 `<run_id>/manifest.json` (chunk count)

## Outputs

- Postgres `chunks` table (vectors + metadata, HNSW index rebuilt)
- Returns: summary `{ inserted, run_id }`

## Activities

| Activity | Queue | Description |
|:--|:--|:--|
| [`read_chunk_count`](./../manifest_activity.py) | `default` | Read the manifest for the shard count |
| [`load_vectors`](./activities/load_vectors.py) | `db-queue` | Single writer: TRUNCATE → DROP HNSW → bulk COPY → REBUILD HNSW |
