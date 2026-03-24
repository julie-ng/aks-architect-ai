import { pgTable, uuid, text, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubId: integer('github_id').notNull(),
  username: text('username').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('users_github_id_idx').on(table.githubId),
])

export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  // TODO: replace hardcoded default with shared constant (skipped to avoid unnecessary migration — do it in the next one)
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

export const designs = pgTable('designs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title').notNull().default('Untitled Design'),
  description: text('description'),
  requirements: jsonb('requirements').notNull().default({}),
  decisions: jsonb('decisions').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('designs_user_updated_idx').on(table.userId, table.updatedAt.desc()),
])
