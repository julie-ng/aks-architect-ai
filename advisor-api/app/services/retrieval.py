import math

import ollama
from qdrant_client import QdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchAny, MatchValue

from app.config import Settings


def embed_query(question: str, model: str, prefix: str) -> list[float]:
    """Embed a question string using Ollama."""
    response = ollama.embeddings(model=model, prompt=prefix + question)
    return response["embedding"]


def build_filter(tags: dict[str, str | list[str]]) -> Filter:
    """Build a Qdrant filter from a tag dict.

    Keys are dot-paths into the payload (e.g. "tags.doc_type").
    Values can be a single string (MatchValue) or a list (MatchAny).
    """
    conditions = []
    for key, value in tags.items():
        if isinstance(value, list):
            conditions.append(FieldCondition(key=key, match=MatchAny(any=value)))
        else:
            conditions.append(FieldCondition(key=key, match=MatchValue(value=value)))
    return Filter(must=conditions)


def search_chunks(
    client: QdrantClient,
    vector: list[float],
    collection: str,
    top_k: int,
    filters: dict[str, str | list[str]] | None = None,
):
    """Search Qdrant for the nearest chunks, with optional tag filtering."""
    query_filter = build_filter(filters) if filters else None

    response = client.query_points(
        collection_name=collection,
        query=vector,
        limit=top_k,
        with_payload=True,
        query_filter=query_filter,
    )
    return response.points


def boost_by_priority(results: list[dict], weight: float) -> list[dict]:
    """Re-rank results by combining similarity score with priority.

    boosted = similarity * (1 + log(priority) * weight)

    Priority of 1 gives no boost (log(1) = 0). Higher priorities
    get a logarithmic nudge so they don't completely dominate similarity.
    """
    for r in results:
        priority = r.get("priority") or 1
        priority = max(priority, 1)
        r["boosted_score"] = r["score"] * (1 + math.log(priority) * weight)

    results.sort(key=lambda r: r["boosted_score"], reverse=True)
    return results


def retrieve(
    question: str,
    client: QdrantClient,
    settings: Settings,
    filters: dict[str, str | list[str]] | None = None,
) -> list[dict]:
    """High-level: embed question, search Qdrant, re-rank by priority, return results."""
    vector = embed_query(question, settings.embedding_model, settings.embedding_prefix)

    # Fetch extra candidates so re-ranking has a larger pool
    fetch_k = settings.retrieval_top_k * 3
    points = search_chunks(client, vector, settings.qdrant_collection, fetch_k, filters)

    results = []
    for point in points:
        p = point.payload
        results.append({
            "id": str(point.id),
            "title": p.get("title", "(no title)"),
            "url": p.get("url", ""),
            "score": point.score,
            "text": p.get("text", ""),
            "tags": p.get("tags", {}),
            "priority": p.get("priority"),
        })

    results = boost_by_priority(results, settings.priority_boost_weight)

    return results[:settings.retrieval_top_k]
