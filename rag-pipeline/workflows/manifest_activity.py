"""Activity: read the run manifest (shard count).

The shard count MUST come from an activity (recorded in history), never from live
I/O inside a workflow — otherwise a replay could schedule a different number of
activities and break determinism. Both the tag and embed workflows use this to size
their fan-out. Runs on the default queue (cheap).
"""

from temporalio import activity

from helpers import storage
from workflows.shared import MANIFEST_NAME


@activity.defn
def read_chunk_count(run_id: str) -> int:
    """Return the chunk (shard) count recorded in `<run_id>/manifest.json`."""
    manifest = storage.read_json_single(storage.run_key(MANIFEST_NAME, run_id=run_id))
    count = int(manifest["chunk_count"])
    activity.logger.info("run %s manifest: %d chunks", run_id, count)
    return count
