"""Tests for the JSON log formatter (message + details shape)."""

import json
import logging

from workflows.logging_config import JsonFormatter


def _record(msg="msg", level=logging.INFO, **extra):
    rec = logging.LogRecord("temporalio.activity", level, "x.py", 1, msg, None, None)
    rec.__dict__.update(extra)
    return rec


# A realistic temporalio activity context (attached by its LoggerAdapter).
_TEMPORAL_CTX = {
    "activity_id": "4",
    "activity_type": "tag_shard",
    "attempt": 1,
    "namespace": "default",
    "task_queue": "bedrock-queue",
    "workflow_id": "tag-20260717T154534Z-json",
    "run_id": "019f70c1-5169-7a83-b8d3-f8a7db5a0b28",  # workflow-run UUID, NOT pipeline run
    "workflow_type": "TaggingWorkflow",
}


class TestJsonFormatter:
    def test_valid_single_line_json(self):
        line = JsonFormatter().format(_record())
        assert "\n" not in line
        json.loads(line)

    def test_core_fields(self):
        parsed = json.loads(JsonFormatter().format(_record("tagged", level=logging.WARNING)))
        assert parsed["message"] == "tagged"
        assert parsed["level"] == "WARNING"
        assert parsed["logger"] == "temporalio.activity"
        assert "time" in parsed

    def test_message_is_clean_string(self):
        parsed = json.loads(JsonFormatter().format(_record("tagged successfully")))
        assert parsed["message"] == "tagged successfully"
        assert isinstance(parsed["message"], str)

    def test_extra_fields_go_under_details(self):
        parsed = json.loads(JsonFormatter().format(_record("tagged", run_id="r1", shard=2, tags=3)))
        assert parsed["details"] == {"run_id": "r1", "shard": 2, "tags": 3}

    def test_adapter_context_suffix_stripped_from_message(self):
        # temporalio's LoggerAdapter appends " ({...})" to the message — must not leak.
        polluted = "tagged ({'activity_id': '4', 'attempt': 1, 'task_queue': 'bedrock-queue'})"
        parsed = json.loads(JsonFormatter().format(_record(polluted)))
        assert parsed["message"] == "tagged"
        assert "activity_id" not in parsed["message"]

    def test_temporal_context_flattened_into_details(self):
        rec = _record("tagged", run_id="20260717T154534Z-json", shard=2, temporal_activity=dict(_TEMPORAL_CTX))
        parsed = json.loads(JsonFormatter().format(rec))
        d = parsed["details"]
        assert d["activity_type"] == "tag_shard"
        assert d["attempt"] == 1
        assert d["workflow_id"] == "tag-20260717T154534Z-json"

    def test_temporal_run_id_does_not_clobber_pipeline_run_id(self):
        rec = _record("tagged", run_id="20260717T154534Z-json", temporal_activity=dict(_TEMPORAL_CTX))
        d = json.loads(JsonFormatter().format(rec))["details"]
        assert d["run_id"] == "20260717T154534Z-json"  # our pipeline run wins
        assert d["workflow_run_id"] == "019f70c1-5169-7a83-b8d3-f8a7db5a0b28"  # temporal's, renamed

    def test_no_details_key_when_empty(self):
        parsed = json.loads(JsonFormatter().format(_record("plain")))
        assert "details" not in parsed

    def test_standard_record_noise_excluded(self):
        parsed = json.loads(JsonFormatter().format(_record("m", run_id="r1")))
        for noise in ("args", "levelno", "pathname", "lineno", "funcName"):
            assert noise not in parsed.get("details", {})

    def test_exception_rendered(self):
        import sys

        try:
            raise ValueError("boom")
        except ValueError:
            rec = _record("failed", level=logging.ERROR)
            rec.exc_info = sys.exc_info()
            parsed = json.loads(JsonFormatter().format(rec))
        assert "ValueError" in parsed["exc"]

    def test_non_serializable_value_falls_back_to_str(self):
        parsed = json.loads(JsonFormatter().format(_record("m", obj=object())))
        assert isinstance(parsed["details"]["obj"], str)
