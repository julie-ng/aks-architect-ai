"""Shared SQL for loading chunk vectors into Postgres/pgvector.

Used by both the CLI `embed.py` and the Temporal `load_vectors` activity so the INSERT
shape and the HNSW index (name + create statement) stay in ONE place. Must stay in
sync with `db/init.sql`, which creates the same index on the empty table at init.
"""

# Column order shared by both load paths (INSERT param names + COPY row tuples).
# Keep this list, INSERT_SQL, and COPY_SQL in lockstep.
COLUMNS = (
    "id",
    "text",
    "url",
    "title",
    "description",
    "source_name",
    "priority",
    "tags",
    "chunk_index",
    "chunk_total",
    "crawled_at",
    "embedding",
)

# Used by the old CLI embed.py (kept as the executemany baseline for before/after).
INSERT_SQL = """
    INSERT INTO chunks
        (id, text, url, title, description, source_name,
         priority, tags, chunk_index, chunk_total, crawled_at, embedding)
    VALUES
        (%(id)s, %(text)s, %(url)s, %(title)s, %(description)s, %(source_name)s,
         %(priority)s, %(tags)s, %(chunk_index)s, %(chunk_total)s, %(crawled_at)s, %(embedding)s)
"""

# Used by the Temporal load_vectors activity. COPY streams all rows in one bulk
# operation (no per-row parse/plan/round-trip) → 5-20× faster than executemany on a
# clean load. FORMAT BINARY because pgvector's dumper is binary and it sidesteps text
# escaping entirely; the activity calls copy.set_types() so the vector / jsonb /
# timestamptz dumpers are explicit, then copy.write_row() per shard.
COPY_SQL = f"COPY chunks ({', '.join(COLUMNS)}) FROM STDIN (FORMAT BINARY)"

# Postgres types for COPY_SQL columns, in COLUMNS order — passed to copy.set_types().
# vector/jsonb/timestamptz need explicit types so psycopg picks the right binary dumper
# (a str would otherwise NOT cast into timestamptz under binary COPY).
COPY_TYPES = (
    "uuid",
    "text",
    "text",
    "text",
    "text",
    "text",
    "int4",
    "jsonb",
    "int4",
    "int4",
    "timestamptz",
    "vector",
)

# HNSW index maintenance on every INSERT is I/O-heavy — on a small instance it
# saturates disk and stalls the connection. So callers DROP the index before the bulk
# load and rebuild it once afterwards (far cheaper than N incremental updates).
HNSW_INDEX_NAME = "chunks_embedding_idx"
CREATE_HNSW_SQL = f"""
    CREATE INDEX IF NOT EXISTS {HNSW_INDEX_NAME}
        ON chunks USING hnsw (embedding vector_cosine_ops)
"""
