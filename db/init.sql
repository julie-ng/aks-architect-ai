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

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY,
  -- user_id UUID REFERENCES users(id),  -- auth-ready
  title TEXT NOT NULL DEFAULT '(untitled chat)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_updated_idx ON chat_sessions (updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,                    -- AI SDK message id (nanoid, not UUID)
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  parts JSONB NOT NULL DEFAULT '[]',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages (session_id, sort_order);
