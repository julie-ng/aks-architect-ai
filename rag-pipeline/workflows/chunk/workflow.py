"""ChunkWorkflow — read sources, chunk them into shards.

Single-activity stage (chunking is fast + CPU-bound, nothing to fan out). Emits
fan-out-ready chunk shards + a manifest for the tag stage. Independently startable:
start this directly to re-chunk a run without touching tag/embed.
"""

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from workflows.chunk.activities.chunk_documents import chunk_documents
    from workflows.chunk.activities.read_sources import read_sources
    from workflows.shared import CHUNK_ACTIVITY_TIMEOUT, DEFAULT_QUEUE


@workflow.defn
class ChunkWorkflow:
    @workflow.run
    async def run(self, run_id: str) -> int:
        """Read sources → chunk into shards. Returns the chunk (shard) count."""
        docs = await workflow.execute_activity(
            read_sources,
            start_to_close_timeout=CHUNK_ACTIVITY_TIMEOUT,
            task_queue=DEFAULT_QUEUE,
        )
        chunk_count = await workflow.execute_activity(
            chunk_documents,
            args=[run_id, docs],
            start_to_close_timeout=CHUNK_ACTIVITY_TIMEOUT,
            task_queue=DEFAULT_QUEUE,
        )
        workflow.logger.info("chunking complete", extra={"run_id": run_id, "shards": chunk_count})
        return chunk_count
