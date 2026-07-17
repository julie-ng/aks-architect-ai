"""Storage backend for pipeline artifacts — local disk or S3.

The pipeline stages (chunk → tag → embed) hand off JSONL/JSON artifacts. This
module abstracts the read/write so the same code runs against local disk in dev
and S3 in the deployed (Lambda) pipeline, selected by `STORAGE_BACKEND`.

A "key" is a plain relative path (e.g. `chunks.jsonl` or `20260717T104530Z/chunks.jsonl`).
- local backend roots keys under `cfg.storage_base_dir` (default `.`)
- s3 backend puts keys under `s3://<cfg.s3_bucket>/`
The same key string works for both backends.

Use `run_key(name)` to build a run-scoped key: it prefixes `name` with
`cfg.pipeline_run_id` when set, so a run's artifacts live under `<runId>/`.

The boto3 client is created lazily, so pure-local runs need no AWS credentials.
"""

import json
from collections.abc import Iterable, Iterator
from pathlib import Path

from config import config as cfg

_s3_client = None


def _s3():
    """Lazily create (and cache) the boto3 S3 client. Only imported/used for s3."""
    global _s3_client
    if _s3_client is None:
        import boto3

        _s3_client = boto3.client("s3", region_name=cfg.aws_region)
    return _s3_client


def _require_bucket() -> str:
    if not cfg.s3_bucket:
        raise ValueError("STORAGE_BACKEND=s3 requires S3_BUCKET to be set")
    return cfg.s3_bucket


def run_key(name: str) -> str:
    """Build a run-scoped key: `<pipeline_run_id>/<name>`, or bare `<name>` if unset.

    For s3, a run id is required (refuse to write to a null run); for local, an
    unset run id means the current behavior (bare filenames under storage_base_dir).
    """
    if cfg.pipeline_run_id:
        return f"{cfg.pipeline_run_id}/{name}"
    if cfg.storage_backend == "s3":
        raise ValueError("STORAGE_BACKEND=s3 requires PIPELINE_RUN_ID to be set")
    return name


def read_text(key: str) -> str:
    """Read the full contents of `key` as text."""
    if cfg.storage_backend == "s3":
        obj = _s3().get_object(Bucket=_require_bucket(), Key=key)
        return obj["Body"].read().decode("utf-8")
    return (Path(cfg.storage_base_dir) / key).read_text(encoding="utf-8")


def write_text(key: str, data: str) -> None:
    """Write `data` to `key`, creating parent directories on the local backend."""
    if cfg.storage_backend == "s3":
        _s3().put_object(Bucket=_require_bucket(), Key=key, Body=data.encode("utf-8"))
    else:
        path = Path(cfg.storage_base_dir) / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(data, encoding="utf-8")


def read_json_lines(key: str) -> Iterator[dict]:
    """Yield one parsed object per non-blank line of a JSONL artifact."""
    for line in read_text(key).splitlines():
        if line.strip():
            yield json.loads(line)


def write_json_lines(key: str, rows: Iterable[dict]) -> None:
    """Serialize `rows` as JSONL (one object per line) and write to `key`."""
    body = "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows)
    write_text(key, body)


def list_keys(prefix: str) -> list[str]:
    """List keys under `prefix`, sorted.

    local: files directly under `<storage_base_dir>/<prefix>` (non-recursive glob),
    returned as keys relative to storage_base_dir.
    s3: object keys under the prefix (paginated).
    """
    if cfg.storage_backend == "s3":
        keys: list[str] = []
        paginator = _s3().get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=_require_bucket(), Prefix=prefix):
            keys.extend(obj["Key"] for obj in page.get("Contents", []))
        return sorted(keys)

    base = Path(cfg.storage_base_dir)
    directory = base / prefix
    if not directory.exists():
        return []
    return sorted(str(p.relative_to(base)) for p in directory.iterdir() if p.is_file())
