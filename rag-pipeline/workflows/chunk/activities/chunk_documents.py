"""Activity: chunk source documents and write fan-out-ready shards + manifest.

The PRODUCER of the chunk artifacts owns their sharding (so the tag stage reads
shards directly, without re-downloading and re-splitting a single file). Writes one
S3 object per chunk (`<run_id>/chunks/NNNN.json`) plus a manifest with the count,
which the tag workflow reads to know how many activities to fan out.

Non-deterministic (S3 I/O) → an activity. Chunking itself is fast + CPU-bound, so
this stays a single activity (no fan-out).
"""

# chunk.py holds the pure chunking logic; reuse it rather than duplicating.
from chunk import chunk_document  # noqa: E402  (local module, not the stdlib `chunk`)

from temporalio import activity

from config import config as cfg
from helpers import storage
from workflows.shared import MANIFEST_NAME, chunk_shard_key


@activity.defn
def chunk_documents(run_id: str, docs: list[dict]) -> int:
    """Chunk all docs, write one shard per chunk + a manifest. Returns chunk count.

    Idempotent: re-running overwrites the same keys (deterministic content). Safe on
    Temporal retry — the blast radius is the whole stage, but chunking is cheap.
    """
    all_chunks: list[dict] = []
    for doc in docs:
        all_chunks.extend(chunk_document(doc))

    total = len(all_chunks)
    for i, chunk in enumerate(all_chunks):
        storage.write_json_single(storage.run_key(chunk_shard_key(i), run_id=run_id), chunk)

    # Manifest: the shard count, recorded so the tag workflow fans out deterministically.
    storage.write_json_single(
        storage.run_key(MANIFEST_NAME, run_id=run_id),
        {"chunk_count": total, "chunk_max_chars": cfg.chunk_max_chars},
    )
    activity.logger.info(
        "chunked docs into shards",
        extra={"run_id": run_id, "docs": len(docs), "shards": total},
    )
    return total
