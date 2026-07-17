"""ChunkWorkflow — read sources, chunk them into shards.

Single-activity stage (chunking is fast + CPU-bound, nothing to fan out). Emits
fan-out-ready chunk shards + a manifest for the tag stage. Independently startable:
start this directly to re-chunk a run without touching tag/embed.
"""

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from workflows.chunk.activities.chunk_documents import chunk_documents
    from workflows.shared import CHUNK_ACTIVITY_TIMEOUT, DEFAULT_QUEUE, LOCAL_RETRY


@workflow.defn
class ChunkWorkflow:
    @workflow.run
    async def run(self, run_id: str) -> int:
        """Read S3 sources → chunk into shards. Returns the chunk (shard) count.

        A single activity reads sources and writes shards, both by reference through S3,
        so no bulk doc list crosses a Temporal payload boundary (the ~3MB dataset would
        exceed the 2MB limit).
        """
        chunk_count = await workflow.execute_activity(
            chunk_documents,
            run_id,
            start_to_close_timeout=CHUNK_ACTIVITY_TIMEOUT,
            task_queue=DEFAULT_QUEUE,
            retry_policy=LOCAL_RETRY,
        )
        workflow.logger.info("chunking complete", extra={"run_id": run_id, "shards": chunk_count})
        return chunk_count
