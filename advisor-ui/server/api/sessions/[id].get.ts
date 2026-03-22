import { eq, asc, and } from 'drizzle-orm'
import { chatSessions, chatMessages } from '../../db/schema'

/**
 * GET /api/sessions/:id — get a single session with its messages.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  const [session] = await db().select({
    id: chatSessions.id,
    title: chatSessions.title,
    createdAt: chatSessions.createdAt,
    updatedAt: chatSessions.updatedAt,
  }).from(chatSessions).where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))

  if (!session) {
    throw createError({ statusCode: 404, message: 'Session not found' })
  }

  const messages = await db().select({
    id: chatMessages.id,
    role: chatMessages.role,
    parts: chatMessages.parts,
    metadata: chatMessages.metadata,
  }).from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(asc(chatMessages.sortOrder))

  return { ...session, messages }
})
