import json
import math

import ollama
from psycopg import Connection
from psycopg.rows import dict_row

from app.config import Settings

SEARCH_SQL = """
    SELECT id::text, text, url, title, description, source_name, priority, tags,
           1 - (embedding <=> %(vector)s::vector) AS score
    FROM chunks
    WHERE 1=1 {filter_clause}
    ORDER BY embedding <=> %(vector)s::vector
    LIMIT %(limit)s
"""


def embed_query(question: str, model: str, prefix: str) -> list[float]:
    """Embed a question string using Ollama."""
    response = ollama.embeddings(model=model, prompt=prefix + question)
    return response["embedding"]


def build_filter_clause(filters: dict[str, str | list[str]]) -> tuple[str, dict]:
    """Build SQL WHERE clause fragments from a tag filter dict.

    Keys are dot-paths like "tags.doc_type" where the first part is the JSONB column
    and the second is the JSON key. Values can be a string or list of strings.

    Returns (sql_fragment, params_dict).
    """
    clauses = []
    params: dict = {}
    for i, (key, value) in enumerate(filters.items()):
        parts = key.split(".", 1)
        if len(parts) != 2:
            continue
        col, field = parts
        param_name = f"f{i}"
        if isinstance(value, list):
            clauses.append(f"AND {col}->>'{field}' = ANY(%({param_name})s)")
            params[param_name] = value
        else:
            clauses.append(f"AND {col}->>'{field}' = %({param_name})s")
            params[param_name] = value
    return " ".join(clauses), params


def search_chunks(
    conn: Connection,
    vector: list[float],
    top_k: int,
    filters: dict[str, str | list[str]] | None = None,
) -> list[dict]:
    """Search pgvector for the nearest chunks, with optional tag filtering."""
    filter_clause = ""
    filter_params: dict = {}
    if filters:
        filter_clause, filter_params = build_filter_clause(filters)

    sql = SEARCH_SQL.format(filter_clause=filter_clause)
    params = {"vector": json.dumps(vector), "limit": top_k, **filter_params}

    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(sql, params)
        return cur.fetchall()


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
    conn: Connection,
    settings: Settings,
    filters: dict[str, str | list[str]] | None = None,
) -> list[dict]:
    """High-level: embed question, search pgvector, re-rank by priority, return results."""
    vector = embed_query(question, settings.embedding_model, settings.embedding_prefix)

    # Fetch extra candidates so re-ranking has a larger pool
    fetch_k = settings.retrieval_top_k * 3
    rows = search_chunks(conn, vector, fetch_k, filters)

    results = []
    for row in rows:
        results.append(
            {
                "id": row["id"],
                "title": row.get("title", "(no title)"),
                "url": row.get("url", ""),
                "score": row["score"],
                "text": row.get("text", ""),
                "tags": row.get("tags", {}),
                "priority": row.get("priority"),
            }
        )

    results = boost_by_priority(results, settings.priority_boost_weight)

    return results[: settings.retrieval_top_k]
