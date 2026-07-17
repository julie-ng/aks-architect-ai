"""PipelineWorkflow — chain chunk → tag → embed for one run.

Threads a single run_id through the three stage workflows as CHILD workflows. Each
child is also independently startable on its own (re-tag without re-chunk, etc.); the
parent just sequences them. The chain is strict (each stage needs the prior's output).
"""

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from workflows.chunk.workflow import ChunkWorkflow
    from workflows.embed.workflow import EmbedWorkflow
    from workflows.tag.workflow import TaggingWorkflow


@workflow.defn
class PipelineWorkflow:
    @workflow.run
    async def run(self, run_id: str) -> dict:
        chunk_count = await workflow.execute_child_workflow(
            ChunkWorkflow.run, run_id, id=f"chunk-{run_id}"
        )
        tag_summary = await workflow.execute_child_workflow(
            TaggingWorkflow.run, run_id, id=f"tag-{run_id}"
        )
        embed_summary = await workflow.execute_child_workflow(
            EmbedWorkflow.run, run_id, id=f"embed-{run_id}"
        )
        result = {
            "run_id": run_id,
            "chunk_count": chunk_count,
            "tag": tag_summary,
            "embed": embed_summary,
        }
        workflow.logger.info(
            "pipeline complete",
            extra={
                "run_id": run_id,
                "chunk_count": chunk_count,
                "tagged": tag_summary.get("tagged"),
                "inserted": embed_summary.get("inserted"),
            },
        )
        return result
