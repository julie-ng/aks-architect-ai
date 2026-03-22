import { desc, eq } from 'drizzle-orm'
import { chatSessions } from '../../db/schema'

/**
 * GET /api/sessions — list all chat sessions (metadata only, no messages).
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)

  const sessions = await db().select({
    id: chatSessions.id,
    title: chatSessions.title,
    createdAt: chatSessions.createdAt,
    updatedAt: chatSessions.updatedAt,
  }).from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt))

  return sessions
})
