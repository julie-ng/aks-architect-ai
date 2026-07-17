"""Start a pipeline (or single-stage) workflow run.

Generates a sortable UTC run_id and starts the chosen workflow on the default queue.
The stage workflows are independently startable, so you can run just one:

  AWS_PROFILE=process uv run python -m workflows.starter               # full pipeline
  AWS_PROFILE=process uv run python -m workflows.starter --stage tag   # re-tag a run
  AWS_PROFILE=process uv run python -m workflows.starter --stage tag --run-id 20260718T101500Z

Needs `temporal server start-dev` + a running worker + S3/RDS env.
"""

import argparse
import asyncio
from datetime import datetime, timezone

from temporalio.client import Client

from config import config as cfg
from workflows.chunk.workflow import ChunkWorkflow
from workflows.embed.load_vectors_workflow import LoadVectorsWorkflow
from workflows.embed.workflow import EmbedWorkflow
from workflows.pipeline.workflow import PipelineWorkflow
from workflows.shared import DEFAULT_QUEUE
from workflows.tag.workflow import TaggingWorkflow

STAGES = {
    "pipeline": PipelineWorkflow,
    "chunk": ChunkWorkflow,
    "tag": TaggingWorkflow,
    "embed": EmbedWorkflow,
    # load-vectors = re-load existing S3 vectors into Postgres WITHOUT re-embedding (recovery).
    "load-vectors": LoadVectorsWorkflow,
}


def _new_run_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Start a RAG pipeline Temporal workflow")
    parser.add_argument("--stage", choices=STAGES, default="pipeline", help="Which workflow to run")
    parser.add_argument("--run-id", default=None, help="Reuse an existing run id (default: new UTC timestamp)")
    args = parser.parse_args()

    run_id = args.run_id or _new_run_id()
    wf = STAGES[args.stage]

    client = await Client.connect(cfg.temporal_address, namespace=cfg.temporal_namespace)
    print(f"Starting {args.stage} workflow, run_id={run_id}")
    handle = await client.start_workflow(
        wf.run,
        run_id,
        id=f"{args.stage}-{run_id}",
        task_queue=DEFAULT_QUEUE,
    )
    print(f"Started workflow id={handle.id}. Waiting for result...")
    result = await handle.result()
    print("Result:", result)


if __name__ == "__main__":
    asyncio.run(main())
