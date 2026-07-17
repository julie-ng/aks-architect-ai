"""Activity: tag one chunk shard via Bedrock Nova, write the tagged shard.

Lifts the existing tagging logic (`tag.py::tag_chunk`, which uses the cached Converse
system prompt) — the activity is a thin S3-read → tag → S3-write wrapper. Runs on the
bedrock-queue (rate-limited) with the exponential-backoff retry policy.

Error handling: botocore raises ClientError for BOTH throttling (retryable) and
ValidationException (the `eu.` inference-profile gotcha — NOT retryable, retrying
just burns attempts). We re-raise ValidationException as a non-retryable
ApplicationError so the RetryPolicy fails it fast; throttling falls through to the
policy's backoff.
"""

from botocore.exceptions import ClientError
from temporalio import activity
from temporalio.exceptions import ApplicationError

from helpers import storage
from helpers.taxonomy import format_taxonomy_prompt, load_taxonomy
from tag import build_system_prompt, tag_chunk
from workflows.shared import chunk_shard_key, shard_prefix, tagged_shard_key

# Built once per worker process and reused across every shard (the taxonomy is static
# for a run). Lazily initialised so importing this module does no I/O.
_system_prompt: str | None = None
_valid_tags: set[str] | None = None


def _ensure_prompt() -> tuple[str, set[str]]:
    global _system_prompt, _valid_tags
    if _system_prompt is None:
        taxonomy = load_taxonomy()
        _system_prompt = build_system_prompt(format_taxonomy_prompt(taxonomy))
        _valid_tags = {t["tag"] for t in taxonomy}
    assert _valid_tags is not None
    return _system_prompt, _valid_tags


@activity.defn
def tag_shard(run_id: str, index: int) -> int:
    """Tag chunk shard `index`; write `tagged/NNNN.json`. Returns the tag count.

    Idempotent: overwrites its own single output key on retry (blast radius = 1 shard).
    """
    system_prompt, valid_tags = _ensure_prompt()
    prefix = shard_prefix(run_id, index)

    chunk = storage.read_json_single(storage.run_key(chunk_shard_key(index), run_id=run_id))

    try:
        assigned = tag_chunk(chunk["text"], chunk.get("title", ""), system_prompt)
    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code == "ValidationException":
            # Bad/stale model id or malformed input — retrying cannot fix it.
            activity.logger.error("%s ValidationException (non-retryable): %s", prefix, e)
            raise ApplicationError(f"Bedrock ValidationException: {e}", non_retryable=True) from e
        activity.logger.warning("%s Bedrock error %s — will retry: %s", prefix, code or "?", e)
        raise  # ThrottlingException etc. → let the RetryPolicy back off and retry.

    assigned = [t for t in assigned if t in valid_tags]

    tags = chunk.get("tags", {})
    tags["taxonomy"] = assigned
    chunk["tags"] = tags

    storage.write_json_single(storage.run_key(tagged_shard_key(index), run_id=run_id), chunk)
    activity.logger.info("%s → tagged %d", prefix, len(assigned))
    return len(assigned)
