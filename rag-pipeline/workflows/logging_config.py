"""JSON logging for the Temporal workers.

Emits one JSON object per line so CloudWatch Logs (phase 4: workers → Lambda) parses
each field as a queryable key — e.g. Logs Insights `filter attempt > 1` finds every
retry across a run. Fields passed via `logger.info("msg", extra={...})` become
top-level keys (see workflows/shared.py::shard_fields).

Level via LOG_LEVEL (default INFO). No third-party dependency — stdlib logging only.
"""

import datetime
import json
import logging
import os
import re

# Attributes present on every stdlib LogRecord; anything else on a record came from
# `extra={...}` (our structured fields) and belongs under `details`.
_STD_RECORD_ATTRS = set(logging.makeLogRecord({}).__dict__.keys()) | {"message", "asctime", "taskName"}

# temporalio's LoggerAdapter appends its context as " ({...})" to the message string.
# We keep the context (as structured `details`, from the temporal_* record attrs) but
# strip it off the human message so `message` is a clean string.
_ADAPTER_CONTEXT_SUFFIX = re.compile(r"\s*\(\{.*\}\)\s*$", re.DOTALL)


class JsonFormatter(logging.Formatter):
    """Render a LogRecord as a single-line JSON object: {time, level, logger, message, details}.

    `message` is a pure human string; all structured fields (our extra={...} plus the
    temporalio activity/workflow context) go under `details`.
    """

    def format(self, record: logging.LogRecord) -> str:
        message = _ADAPTER_CONTEXT_SUFFIX.sub("", record.getMessage())

        details: dict = {}
        # temporalio context first (so our own extra={...} wins on any key clash — our
        # `run_id` is the PIPELINE run id, distinct from temporal's workflow run UUID).
        for ctx_key in ("temporal_activity", "temporal_workflow"):
            ctx = record.__dict__.get(ctx_key)
            if isinstance(ctx, dict):
                for k, v in ctx.items():
                    # temporal's own `run_id` is the workflow-execution UUID — keep it
                    # under a distinct key so it never clobbers our pipeline run_id.
                    details["workflow_run_id" if k == "run_id" else k] = v

        # Our own extra={...} fields (run_id, shard, attempt, tags, ...) — authoritative.
        for key, value in record.__dict__.items():
            if key in _STD_RECORD_ATTRS or key.startswith("_"):
                continue
            if key in ("temporal_activity", "temporal_workflow"):
                continue  # already flattened above
            details[key] = value

        payload = {
            "time": datetime.datetime.fromtimestamp(record.created, tz=datetime.timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": message,
        }
        if details:
            payload["details"] = details
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging() -> None:
    """Install the JSON formatter on the root handler. Idempotent-ish (resets handlers)."""
    level = os.environ.get("LOG_LEVEL", "INFO").upper()
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Quiet noisy libraries so pipeline lines dominate.
    for noisy in ("botocore", "boto3", "urllib3", "temporalio.client"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
