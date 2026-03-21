CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY,
  text TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  source_name TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  tags JSONB DEFAULT '{}',
  chunk_index INTEGER NOT NULL,
  chunk_total INTEGER NOT NULL,
  crawled_at TIMESTAMPTZ,
  embedding vector(768) NOT NULL
);

CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_tags_idx ON chunks USING gin (tags);
CREATE INDEX IF NOT EXISTS chunks_source_name_idx ON chunks (source_name);
