"""Shared SQL for loading chunk vectors into Postgres/pgvector.

Used by both the CLI `embed.py` and the Temporal `load_vectors` activity so the INSERT
shape and the HNSW index (name + create statement) stay in ONE place. Must stay in
sync with `db/init.sql`, which creates the same index on the empty table at init.
"""

INSERT_SQL = """
    INSERT INTO chunks
        (id, text, url, title, description, source_name,
         priority, tags, chunk_index, chunk_total, crawled_at, embedding)
    VALUES
        (%(id)s, %(text)s, %(url)s, %(title)s, %(description)s, %(source_name)s,
         %(priority)s, %(tags)s, %(chunk_index)s, %(chunk_total)s, %(crawled_at)s, %(embedding)s)
"""

# HNSW index maintenance on every INSERT is I/O-heavy — on a small instance it
# saturates disk and stalls the connection. So callers DROP the index before the bulk
# load and rebuild it once afterwards (far cheaper than N incremental updates).
HNSW_INDEX_NAME = "chunks_embedding_idx"
CREATE_HNSW_SQL = f"""
    CREATE INDEX IF NOT EXISTS {HNSW_INDEX_NAME}
        ON chunks USING hnsw (embedding vector_cosine_ops)
"""
