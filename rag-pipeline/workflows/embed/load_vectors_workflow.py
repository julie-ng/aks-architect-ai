"""LoadVectorsWorkflow — bulk-load already-embedded vectors from S3 into Postgres.

Runs ONLY the serialized `load_vectors` activity (no fan-out, no re-embedding), against
the `vectors/*.json` a prior EmbedWorkflow already wrote to S3. Use it to recover when
the embed fan-out succeeded but the DB load failed (e.g. the load activity timed out or
the worker's connection died mid-load), or to re-load the table from existing vectors
without paying to re-embed. Name mirrors the `load_vectors` activity it wraps.

Independently startable: `starter --stage load-vectors --run-id <id>`. NOTE: this is for
RECOVERY / re-load, not benchmarking — a clean embed-stage before/after must run the
full EmbedWorkflow (fan-out + load) uninterrupted.
"""

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from workflows.embed.activities.load_vectors import load_vectors
    from workflows.manifest_activity import read_chunk_count
    from workflows.shared import (
        CHUNK_ACTIVITY_TIMEOUT,
        DB_LOAD_ACTIVITY_TIMEOUT,
        DB_LOAD_RETRY,
        DB_QUEUE,
        DEFAULT_QUEUE,
        LOCAL_RETRY,
    )


@workflow.defn
class LoadVectorsWorkflow:
    @workflow.run
    async def run(self, run_id: str) -> dict:
        """Load `<run_id>/vectors/*.json` into Postgres (Option A). Returns rows inserted."""
        count = await workflow.execute_activity(
            read_chunk_count,
            run_id,
            start_to_close_timeout=CHUNK_ACTIVITY_TIMEOUT,
            task_queue=DEFAULT_QUEUE,
            retry_policy=LOCAL_RETRY,
        )
        inserted = await workflow.execute_activity(
            load_vectors,
            args=[run_id, count],
            start_to_close_timeout=DB_LOAD_ACTIVITY_TIMEOUT,
            task_queue=DB_QUEUE,
            retry_policy=DB_LOAD_RETRY,
        )
        summary = {"run_id": run_id, "inserted": inserted}
        workflow.logger.info("load complete", extra=summary)
        return summary
