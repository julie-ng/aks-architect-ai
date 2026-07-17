"""TaggingWorkflow — fan out tag_shard over the chunk shards.

Reads the shard count from the manifest (an activity — never live I/O in the
workflow), then fans out one tag_shard activity per chunk on the bedrock-queue with
bounded concurrency + early-abort. Independently startable: run this directly against
an existing run's chunk shards to re-tag without re-chunking.
"""

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from workflows.manifest_activity import read_chunk_count
    from workflows.shared import (
        BEDROCK_ACTIVITY_TIMEOUT,
        BEDROCK_QUEUE,
        BEDROCK_RETRY,
        CHUNK_ACTIVITY_TIMEOUT,
        DEFAULT_QUEUE,
        bounded_fanout,
    )
    from workflows.tag.activities.tag_shard import tag_shard


@workflow.defn
class TaggingWorkflow:
    @workflow.run
    async def run(self, run_id: str) -> dict:
        """Tag every chunk shard. Returns a summary dict."""
        count = await workflow.execute_activity(
            read_chunk_count,
            run_id,
            start_to_close_timeout=CHUNK_ACTIVITY_TIMEOUT,
            task_queue=DEFAULT_QUEUE,
        )

        def start(index: int):
            return workflow.execute_activity(
                tag_shard,
                args=[run_id, index],
                start_to_close_timeout=BEDROCK_ACTIVITY_TIMEOUT,
                task_queue=BEDROCK_QUEUE,
                retry_policy=BEDROCK_RETRY,
            )

        failed = await bounded_fanout(count, start)
        summary = {"run_id": run_id, "total": count, "tagged": count - len(failed), "failed": failed}
        workflow.logger.info("tagging complete", extra=summary)
        return summary
