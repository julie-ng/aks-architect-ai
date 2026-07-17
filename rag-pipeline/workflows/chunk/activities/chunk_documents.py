"""Activity: read source docs from S3, chunk them, write shards + manifest.

Reads the crawled source documents from the run-independent `sources/` prefix and
produces per-run chunk shards — all by reference through storage (S3), so no bulk data
crosses a Temporal payload boundary (143 docs ≈ 3MB > Temporal's 2MB limit; returning
them from a read activity and passing them back in would fail with PayloadSizeError).
Only small values cross the workflow boundary: the run_id in, the shard count out.

Sources are uploaded once (crawler output) and read by every run — see SOURCES_PREFIX.
Phase 4: the crawler Lambda writes `sources/`; for now it's a one-time `aws s3 cp` of
the existing local dataset (`make pipeline/upload-sources`).

The PRODUCER owns sharding (the tag stage reads shards directly). Writes one object per
chunk (`<run_id>/chunks/NNNN.json`) plus a manifest with the count.

Non-deterministic (S3 I/O) → an activity. Chunking is fast + CPU-bound, so this stays a
single activity (no fan-out).
"""

import concurrent.futures
import itertools

# chunk.py holds the pure chunking logic; reuse it rather than duplicating.
from chunk import chunk_document  # noqa: E402  (local module, not the stdlib `chunk`)

from temporalio import activity

from config import config as cfg
from helpers import storage
from workflows.shared import MANIFEST_NAME, PROGRESS_LOG_EVERY, SOURCES_PREFIX, chunk_shard_key

# S3 reads/writes here are one HTTP round-trip each; done sequentially, 3040 puts take
# ~15 min. They are independent, so a bounded thread pool collapses that to ~1 min. Same
# S3 request count/cost — only wall-clock changes. boto3's put_object on the shared
# module client is thread-safe in practice.
_S3_IO_CONCURRENCY = 20


@activity.defn
def chunk_documents(run_id: str) -> int:
    """Read S3 sources, chunk them, write one shard per chunk + a manifest. Returns count.

    Idempotent: re-running overwrites the same keys (deterministic content). Safe on
    Temporal retry — the blast radius is the whole stage, but chunking is cheap.
    """
    fields = {"run_id": run_id}

    source_keys = storage.list_keys(SOURCES_PREFIX)
    if not source_keys:
        raise FileNotFoundError(f"no source documents under '{SOURCES_PREFIX}/' — upload the crawler dataset first")
    activity.logger.info("reading + chunking sources", extra={**fields, "sources": len(source_keys)})

    # Read sources concurrently (143 independent GETs).
    with concurrent.futures.ThreadPoolExecutor(max_workers=_S3_IO_CONCURRENCY) as pool:
        docs = list(pool.map(storage.read_json_single, source_keys))
    all_chunks: list[dict] = []
    for doc in docs:
        all_chunks.extend(chunk_document(doc))

    total = len(all_chunks)
    activity.logger.info("writing chunk shards", extra={**fields, "shards": total})

    # Write shards concurrently (independent PUTs). Logging is level-appropriate:
    #   DEBUG → one line per shard (with its index; interleaved under concurrency).
    #   INFO  → a progress line every PROGRESS_LOG_EVERY completions (quiet but alive).
    # `counter` is a thread-safe completion count (itertools.count().__next__ is atomic
    # in CPython) so the INFO progress numbers are correct across the pool's threads.
    counter = itertools.count(1)

    def _write(i: int) -> None:
        storage.write_json_single(storage.run_key(chunk_shard_key(i), run_id=run_id), all_chunks[i])
        activity.logger.debug("wrote shard", extra={**fields, "shard": i})
        done = next(counter)
        if done % PROGRESS_LOG_EVERY == 0 or done == total:
            activity.logger.info("writing progress", extra={**fields, "written": done, "shards": total})

    with concurrent.futures.ThreadPoolExecutor(max_workers=_S3_IO_CONCURRENCY) as pool:
        list(pool.map(_write, range(total)))

    # Manifest: the shard count, recorded so the tag/embed workflows fan out deterministically.
    storage.write_json_single(
        storage.run_key(MANIFEST_NAME, run_id=run_id),
        {"chunk_count": total, "chunk_max_chars": cfg.chunk_max_chars},
    )
    activity.logger.info(
        "chunked sources into shards",
        extra={**fields, "sources": len(source_keys), "shards": total},
    )
    return total
