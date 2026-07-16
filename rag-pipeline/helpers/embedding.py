"""
Shared embedding helper — AWS Bedrock Titan Text Embeddings V2.

Both offline entry points (embed.py, query.py) call `embed_text()` here so the
Bedrock call lives in exactly one place.

IMPORTANT — no more document/query prefixes
--------------------------------------------
The previous model, Ollama `nomic-embed-text`, required a task-specific string
prefix on the input:
    - documents were embedded as  "search_document: " + text   (embed.py)
    - questions were embedded as  "search_query: "    + text    (query.py)
That asymmetry is a Nomic-specific quirk. **Titan does NOT use prefixes** — it
handles the document/query relationship internally. So both call sites now embed
the *raw text* identically; the distinction has simply disappeared. If you go
looking for where the "search_query"/"search_document" logic went: it's gone on
purpose, not lost.

Auth / region
-------------
boto3 uses the standard credential chain — locally that's your AWS profile
(e.g. `AWS_PROFILE=process`), on Lambda it's the function's execution role. We do
NOT pin a profile in code so the same code works in both. Region comes from
config (`AWS_REGION`, default eu-west-1).
"""

import json

import boto3

from config import config as cfg

# One module-level client — boto3 clients are thread-safe and reused across calls.
_client = boto3.client("bedrock-runtime", region_name=cfg.aws_region)


def embed_text(text: str) -> list[float]:
    """
    Return the embedding vector for `text` using Bedrock Titan.

    Titan takes raw text (no prefix). `dimensions` and `normalize` are sent
    explicitly so the output width always matches the Postgres vector column
    (`cfg.embedding_vector_dim`, currently 1024).
    """
    body = json.dumps(
        {
            "inputText": text,
            "dimensions": cfg.embedding_vector_dim,
            "normalize": True,
        }
    )

    response = _client.invoke_model(modelId=cfg.embedding_model, body=body)
    payload = json.loads(response["body"].read())
    return payload["embedding"]
