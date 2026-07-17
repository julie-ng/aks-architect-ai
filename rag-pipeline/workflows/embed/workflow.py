"""EmbedWorkflow — fan out embed_shard, then a single serialized load_vectors.

Two levers, deliberately separate:
- Titan embed CALLS fan out wide (bedrock-queue) — the speed win.
- The DB LOAD is a single serialized activity (db-queue, worker concurrency=1) —
  survival. Never fan out the INSERTs; parallel writes re-create the I/O saturation
  that caused the original crash.

Independently startable: run this against an existing run's tagged shards to re-embed
(e.g. after a model swap) without re-tagging.
"""

from temporalio import workflow
from temporalio.exceptions import ApplicationError

with workflow.unsafe.imports_passed_through():
    from workflows.embed.activities.embed_shard import embed_shard
    from workflows.embed.activities.load_vectors import load_vectors
    from workflows.manifest_activity import read_chunk_count
    from workflows.shared import (
        BEDROCK_ACTIVITY_TIMEOUT,
        BEDROCK_QUEUE,
        BEDROCK_RETRY,
        CHUNK_ACTIVITY_TIMEOUT,
        DB_LOAD_ACTIVITY_TIMEOUT,
        DB_LOAD_RETRY,
        DB_QUEUE,
        DEFAULT_QUEUE,
        bounded_fanout,
    )


@workflow.defn
class EmbedWorkflow:
    @workflow.run
    async def run(self, run_id: str) -> dict:
        """Embed every tagged shard, then bulk-load vectors into Postgres."""
        count = await workflow.execute_activity(
            read_chunk_count,
            run_id,
            start_to_close_timeout=CHUNK_ACTIVITY_TIMEOUT,
            task_queue=DEFAULT_QUEUE,
        )

        def start(index: int):
            return workflow.execute_activity(
                embed_shard,
                args=[run_id, index],
                start_to_close_timeout=BEDROCK_ACTIVITY_TIMEOUT,
                task_queue=BEDROCK_QUEUE,
                retry_policy=BEDROCK_RETRY,
            )

        failed = await bounded_fanout(count, start)
        if failed:
            # A partial embed would load an incomplete vector set. Fail rather than
            # silently under-populate the index. (Below-threshold failures still abort
            # here — embed correctness needs the full set; tagging can tolerate gaps.)
            raise ApplicationError(
                f"embed fan-out had {len(failed)} failures: {failed}", non_retryable=True
            )

        inserted = await workflow.execute_activity(
            load_vectors,
            args=[run_id, count],
            start_to_close_timeout=DB_LOAD_ACTIVITY_TIMEOUT,
            task_queue=DB_QUEUE,
            retry_policy=DB_LOAD_RETRY,
        )
        summary = {"run_id": run_id, "embedded": count, "inserted": inserted}
        workflow.logger.info("EmbedWorkflow: %s", summary)
        return summary
