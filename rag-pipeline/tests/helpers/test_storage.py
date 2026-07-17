"""Tests for the storage backend (local disk + key/routing logic).

S3 backend I/O is not exercised here (no moto dependency for the demo); instead the
s3 routing/guard logic is tested via monkeypatched config, and the full round-trip
is covered against the local backend.
"""

import dataclasses

import pytest

from helpers import storage


def _override(monkeypatch, **fields):
    """Swap storage.cfg for a copy with `fields` overridden (Config is frozen)."""
    new_cfg = dataclasses.replace(storage.cfg, **fields)
    monkeypatch.setattr(storage, "cfg", new_cfg)
    return new_cfg


@pytest.fixture
def local_cfg(tmp_path, monkeypatch):
    """Point the storage module's config at a local tmp dir, backend=local."""
    _override(
        monkeypatch,
        storage_backend="local",
        storage_base_dir=str(tmp_path),
        pipeline_run_id="",
        s3_bucket="",
    )
    return tmp_path


# ---------------------------------------------------------------------------
# run_key
# ---------------------------------------------------------------------------


class TestRunKey:
    def test_bare_key_when_no_run_id_local(self, local_cfg):
        assert storage.run_key("chunks.jsonl") == "chunks.jsonl"

    def test_prefixed_when_run_id_set(self, local_cfg, monkeypatch):
        _override(monkeypatch, pipeline_run_id="20260717T104530Z")
        assert storage.run_key("chunks.jsonl") == "20260717T104530Z/chunks.jsonl"

    def test_s3_requires_run_id(self, monkeypatch):
        _override(monkeypatch, storage_backend="s3", pipeline_run_id="")
        with pytest.raises(ValueError, match="PIPELINE_RUN_ID"):
            storage.run_key("chunks.jsonl")

    def test_s3_with_run_id_ok(self, monkeypatch):
        _override(monkeypatch, storage_backend="s3", pipeline_run_id="run1")
        assert storage.run_key("chunks.jsonl") == "run1/chunks.jsonl"


# ---------------------------------------------------------------------------
# local backend: text + jsonl round-trips
# ---------------------------------------------------------------------------


class TestLocalTextRoundTrip:
    def test_write_then_read(self, local_cfg):
        storage.write_text("hello.txt", "world")
        assert storage.read_text("hello.txt") == "world"
        assert (local_cfg / "hello.txt").read_text() == "world"

    def test_write_creates_parent_dirs(self, local_cfg):
        storage.write_text("20260717T104530Z/chunks.jsonl", "data")
        assert (local_cfg / "20260717T104530Z" / "chunks.jsonl").exists()

    def test_read_missing_raises(self, local_cfg):
        with pytest.raises(FileNotFoundError):
            storage.read_text("nope.txt")


class TestLocalJsonLines:
    def test_round_trip(self, local_cfg):
        rows = [{"id": 1, "text": "a"}, {"id": 2, "text": "b"}]
        storage.write_json_lines("chunks.jsonl", rows)
        assert list(storage.read_json_lines("chunks.jsonl")) == rows

    def test_read_skips_blank_lines(self, local_cfg):
        storage.write_text("x.jsonl", '{"a": 1}\n\n  \n{"b": 2}\n')
        assert list(storage.read_json_lines("x.jsonl")) == [{"a": 1}, {"b": 2}]

    def test_write_empty(self, local_cfg):
        storage.write_json_lines("empty.jsonl", [])
        assert list(storage.read_json_lines("empty.jsonl")) == []

    def test_unicode_preserved(self, local_cfg):
        rows = [{"text": "Azure — Kubernetes · über"}]
        storage.write_json_lines("u.jsonl", rows)
        assert list(storage.read_json_lines("u.jsonl")) == rows


# ---------------------------------------------------------------------------
# local backend: list_keys
# ---------------------------------------------------------------------------


class TestLocalListKeys:
    def test_lists_files_relative_to_base(self, local_cfg):
        (local_cfg / "sources").mkdir()
        (local_cfg / "sources" / "001.json").write_text("{}")
        (local_cfg / "sources" / "002.json").write_text("{}")
        assert storage.list_keys("sources") == ["sources/001.json", "sources/002.json"]

    def test_sorted(self, local_cfg):
        (local_cfg / "d").mkdir()
        for name in ["c.json", "a.json", "b.json"]:
            (local_cfg / "d" / name).write_text("{}")
        assert storage.list_keys("d") == ["d/a.json", "d/b.json", "d/c.json"]

    def test_missing_dir_returns_empty(self, local_cfg):
        assert storage.list_keys("does-not-exist") == []

    def test_ignores_subdirs(self, local_cfg):
        (local_cfg / "d" / "nested").mkdir(parents=True)
        (local_cfg / "d" / "file.json").write_text("{}")
        assert storage.list_keys("d") == ["d/file.json"]


# ---------------------------------------------------------------------------
# s3 guards (no real AWS — just the missing-config error paths)
# ---------------------------------------------------------------------------


class TestS3Guards:
    def test_read_without_bucket_raises(self, monkeypatch):
        _override(monkeypatch, storage_backend="s3", s3_bucket="")
        # _require_bucket fires before any network call
        with pytest.raises(ValueError, match="S3_BUCKET"):
            storage._require_bucket()
