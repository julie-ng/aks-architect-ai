"""Run the Temporal workers for the RAG pipeline (local dev).

Three workers, one process, split by throttled resource:
- default : all workflows + cheap/local activities (chunk, manifest).
- bedrock : tag_shard + embed_shard, rate-limited under Nova/Titan TPS.
- db      : load_vectors, with max_concurrent_activities=1 → single-writer enforced.

Activities are SYNC (blocking boto3/psycopg), so they run in a shared ThreadPoolExecutor.
Workflows are deterministic and run on the async event loop.

Run: `AWS_PROFILE=process uv run python -m workflows.worker`
(needs `temporal server start-dev` running and the S3/RDS env set).
"""

import asyncio
import concurrent.futures
import logging
import signal

from temporalio.worker import Worker

from config import config as cfg
from workflows.chunk.activities.chunk_documents import chunk_documents
from workflows.chunk.workflow import ChunkWorkflow
from workflows.client import connect_client
from workflows.embed.activities.embed_shard import embed_shard
from workflows.embed.activities.load_vectors import load_vectors
from workflows.embed.load_vectors_workflow import LoadVectorsWorkflow
from workflows.embed.workflow import EmbedWorkflow
from workflows.logging_config import configure_logging
from workflows.manifest_activity import read_chunk_count
from workflows.pipeline.workflow import PipelineWorkflow
from workflows.shared import BEDROCK_QUEUE, DB_QUEUE, DEFAULT_QUEUE
from workflows.tag.activities.tag_shard import tag_shard
from workflows.tag.workflow import TaggingWorkflow

ALL_WORKFLOWS = [PipelineWorkflow, ChunkWorkflow, TaggingWorkflow, EmbedWorkflow, LoadVectorsWorkflow]

logger = logging.getLogger("workflows.worker")


async def main() -> None:
    configure_logging()
    client = await connect_client()

    # One executor shared by all sync activities across the workers.
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=64)

    # Code-version stamp for the Cloud UI. None → SDK auto-computes a checksum.
    # Observability only (use_worker_versioning stays off), so it does NOT route tasks.
    build_id = cfg.temporal_build_id or None

    # default: workflows + cheap local activities.
    default_worker = Worker(
        client,
        task_queue=DEFAULT_QUEUE,
        workflows=ALL_WORKFLOWS,
        activities=[chunk_documents, read_chunk_count],
        activity_executor=executor,
        build_id=build_id,
    )

    # bedrock: fan-out model calls (tag + embed). The workflow Semaphores (TAG/EMBED
    # concurrency) are the real throttle; this worker cap is just a generous ceiling above
    # whichever stage is running — 2× the larger per-stage concurrency leaves headroom.
    bedrock_worker = Worker(
        client,
        task_queue=BEDROCK_QUEUE,
        activities=[tag_shard, embed_shard],
        activity_executor=executor,
        max_concurrent_activities=max(cfg.temporal_tag_concurrency, cfg.temporal_embed_concurrency) * 2,
        build_id=build_id,
    )

    # db: the single serialized writer. concurrency=1 makes "never fan out INSERTs"
    # infrastructure, not a convention.
    db_worker = Worker(
        client,
        task_queue=DB_QUEUE,
        activities=[load_vectors],
        activity_executor=executor,
        max_concurrent_activities=1,
        build_id=build_id,
    )

    # Graceful shutdown: SIGINT (Ctrl-C) and SIGTERM (kill / container/Lambda stop) set the
    # same Event. Exiting the `async with` drains each worker's in-flight activities before
    # its poller stops; per-activity resources (e.g. load_vectors' DB connection) are freed
    # in their own `finally`. This replaces `await asyncio.Future()`, which let a bare Ctrl-C
    # unwind as an uncaught KeyboardInterrupt traceback.
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    print(f"Workers running on {cfg.temporal_address} (ns={cfg.temporal_namespace}):")
    print(f"  {DEFAULT_QUEUE}: workflows + chunk/manifest")
    print(f"  {BEDROCK_QUEUE}: tag_shard, embed_shard")
    print(f"  {DB_QUEUE}: load_vectors (single writer)")
    async with default_worker, bedrock_worker, db_worker:
        await stop.wait()
        logger.info("shutdown signal received — draining in-flight activities")
    logger.info("workers stopped cleanly")


if __name__ == "__main__":
    asyncio.run(main())
