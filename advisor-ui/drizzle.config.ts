import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // `chunks` is owned by the RAG pipeline (db/init.sql + the Python embed step),
  // not Drizzle. Without this filter, push/introspect sees `chunks` as unmanaged
  // and proposes DROPPING it — which would destroy the embedded vectors. Scope
  // Drizzle to only the app tables it actually owns. Extend when adding new ones.
  tablesFilter: ['users', 'designs', 'chat_sessions', 'chat_messages'],
})
