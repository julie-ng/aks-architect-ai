## How to Run Temporal Workflows Demo 

This Temporal demo requires AWS infrastructure (Postgres, S3, and Bedrock for LLMs).

### Step 1 - Deploy AWS Infrastructure

This demo requires AWS Bedrock and S3. Go to [/infrastructure/](./../../infrastructure/) and follow instructions and scripts to:

1. Deploy AWS RDS for our Postgres database with `pgvector`
2. Enable in AWS Bedrock the Titan and Nova LLMs needed for this pipeline.
3. Apply IAM roles and permissions 

### Step 2 - Configure Environment

All configuration from the environment. To setup, run these steps:

1. Copy [`.env.sample`](./../../.env.sample) into a `.env` file.

> [!TIP]
> The `.env` file lives in the **project _root_ directory** and is automatically git ignored.

2. Edit and set the variables below (ignore the ones for other parts of the app)

  | Variable | Default / Example | Description |
  |:--|:--|:--|
  | `AWS_PROFILE` | `process` | [AWS credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html#cli-configure-sign-in-cached-credentials)  profile name |
  | `AWS_REGION` | `eu-west-1` | Region for Bedrock / S3 / RDS |
  | `DATABASE_URL` | `postgresql://…@host:5432/db` | Postgres (RDS) connection string |
  | `STORAGE_BACKEND` | `s3` | Pipeline artifact storage backend (`local` or `s3`) |
  | `S3_BUCKET` | `skai-pipeline-store-xyz` | Bucket for sources + stage artifacts |
  | `SOURCES_PREFIX` | `sources` | S3 prefix to read sources from (`sources-sample` for fast iteration) |
  | `TAGGING_MODEL` | `eu.amazon.nova-micro-v1:0` | Bedrock Nova — tagging (needs the `eu.` inference profile) |
  | `EMBEDDING_MODEL` | `amazon.titan-embed-text-v2:0` | Bedrock Titan — embeddings |
  | `TEMPORAL_ADDRESS` | `localhost:7233` | Temporal server address |
  | `TEMPORAL_NAMESPACE` | `default` | Temporal namespace |
  | `TEMPORAL_TAG_CONCURRENCY` | `3` | Tag fan-out concurrency, tuned to Nova 400 RPM |
  | `TEMPORAL_EMBED_CONCURRENCY` | `4` | Embed fan-out concurrency, tuned to Titan 300K TPM |

3. Finally load the variables into your shell 

```bash
# from project root
source ./.env
```

### Step 3 - Copy Sources

To skip the [/web-scraper/](./../../web-scraper/) step, copy the source documents in JSON format from this [`skai-pipeline-store-test-f440010`](https://skai-pipeline-store-test-f440010.s3.eu-west-1.amazonaws.com/?list-type=2&prefix=sources/) S3 bucket (temporarily publicly available).

```bash
aws s3 cp s3://skai-pipeline-store-test-f440010/sources/ ./sources/ \
  --recursive \
  --no-sign-request \
  --region eu-west-1
```

This downloads [143 JSON files](https://skai-pipeline-store-test-f440010.s3.eu-west-1.amazonaws.com/?list-type=2&prefix=sources/) to a local `./sources/`. Then upload them to the `sources/` prefix in **your** bucket:

```bash
aws s3 cp ./sources/ s3://$S3_BUCKET/sources/ \
  --recursive \
  --exclude "*" --include "*.json"
```

### Step 4 - Start Temporal Server

```bash
temporal server start-dev
```

### Step 5A - Start Worker

```bash
caffeinate -i uv run python -m workflows.worker            # caffeinate: don't sleep mid-run
```

### Step 5B - Start Workflow(s)

#### Run Full Pipeline

Run the full RAG pipeline (`pipeline`) that includes all stages, which takes about 25-30 minutes on a MacBook Pro (M3 Pro)

```bash
uv run python -m workflows.starter                         
```

#### Run Individual Stages

It is also possible to run a individual stage, which is useful if the full pipeline fails. For example to run the `tag` stage:

```bash
uv run python -m workflows.starter --stage tag --run-id <id> 
```

Stage Overview

| `--stage` | Workflow | Runs |
|:--|:--|:--|
| `pipeline` | [`PipelineWorkflow`](./pipeline/workflow.py) | Full pipeline (default) — chains chunk → tag → embed |
| `chunk` | [`ChunkWorkflow`](./chunk/workflow.py) | Read S3 sources → chunk shards + manifest |
| `tag` | [`TaggingWorkflow`](./tag/workflow.py) | Fan-out: Nova tags each chunk shard |
| `embed` | [`EmbedWorkflow`](./embed/workflow.py) | Fan-out: Titan embeds each shard, then loads vectors to Postgres |
| `load-vectors` | [`LoadVectorsWorkflow`](./embed/load_vectors_workflow.py) | Re-load existing S3 vectors into Postgres, no re-embed (recovery stage) |

#### Fast iteration

To fine-tune the pipeline configuring, it is useful to run workflows against the ~10% sample set:

```bash
make pipeline/sample-sources          # build sources-sample/ (15 docs) in S3
export SOURCES_PREFIX=sources-sample  # restart worker to pick up; runs in seconds
```

> [!IMPORTANT]
> First upload a sample of the `/sources/` *.json files into S3 with the `sources-sample/` prefix.
