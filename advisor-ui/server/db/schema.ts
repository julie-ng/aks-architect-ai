import { pgTable, uuid, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core'

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull().default('(untitled chat)'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('chat_sessions_updated_idx').on(table.updatedAt.desc()),
])

export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  parts: jsonb('parts').notNull().default([]),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  sortOrder: integer('sort_order').notNull(),
}, (table) => [
  index('chat_messages_session_idx').on(table.sessionId, table.sortOrder),
])
