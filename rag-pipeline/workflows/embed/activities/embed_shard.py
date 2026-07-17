"""Activity: embed one tagged shard via Titan, write the vector shard to S3.

Only the Titan CALL is fanned out here (embarrassingly parallel, ~90% of the embed
cost). The DB write is a separate serialized activity (load_vectors) — vectors go to
S3 by reference, NOT back through Temporal payloads (3040×1024 floats ≈ 12MB would
blow the payload limit). Runs on the bedrock-queue with backoff retries.

Same ValidationException-is-non-retryable handling as tag_shard (a stale/bad
EMBEDDING_MODEL is the embed-side version of the `eu.` gotcha).
"""

from botocore.exceptions import ClientError
from temporalio import activity
from temporalio.exceptions import ApplicationError

from helpers import storage
from helpers.embedding import embed_text
from workflows.shared import shard_fields, tagged_shard_key, vector_shard_key


@activity.defn
def embed_shard(run_id: str, index: int) -> int:
    """Embed tagged shard `index`; write `vectors/NNNN.json` (chunk + embedding).

    Idempotent: overwrites its own single output key on retry (blast radius = 1 shard).
    Returns the embedding dimension (a cheap sanity value).
    """
    fields = shard_fields(run_id, index)
    chunk = storage.read_json_single(storage.run_key(tagged_shard_key(index), run_id=run_id))

    try:
        vector = embed_text(chunk["text"])
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code == "ValidationException":
            activity.logger.error("embed ValidationException (non-retryable)", extra={**fields, "error": str(e)})
            raise ApplicationError(f"Bedrock ValidationException: {e}", non_retryable=True) from e
        activity.logger.warning(
            "embed Bedrock error — will retry", extra={**fields, "code": code or "?", "error": str(e)}
        )
        raise  # ThrottlingException etc. → RetryPolicy backoff.

    chunk["embedding"] = vector
    storage.write_json_single(storage.run_key(vector_shard_key(index), run_id=run_id), chunk)
    activity.logger.info("embedded", extra={**fields, "dim": len(vector)})
    return len(vector)
