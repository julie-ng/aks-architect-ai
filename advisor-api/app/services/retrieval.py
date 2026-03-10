import ollama
from qdrant_client import QdrantClient

from app.config import Settings


def embed_query(question: str, model: str, prefix: str) -> list[float]:
    """Embed a question string using Ollama."""
    response = ollama.embeddings(model=model, prompt=prefix + question)
    return response["embedding"]


def search_chunks(
    client: QdrantClient,
    vector: list[float],
    collection: str,
    top_k: int,
):
    """Search Qdrant for the nearest chunks."""
    response = client.query_points(
        collection_name=collection,
        query=vector,
        limit=top_k,
        with_payload=True,
    )
    return response.points


def retrieve(question: str, client: QdrantClient, settings: Settings) -> list[dict]:
    """High-level: embed question, search Qdrant, return formatted results."""
    vector = embed_query(question, settings.embedding_model, settings.embedding_prefix)
    points = search_chunks(client, vector, settings.qdrant_collection, settings.retrieval_top_k)

    results = []
    for point in points:
        p = point.payload
        results.append({
            "title": p.get("title", "(no title)"),
            "url": p.get("url", ""),
            "score": point.score,
            "text": p.get("text", ""),
            "tags": p.get("tags", {}),
            "priority": p.get("priority"),
        })
    return results
