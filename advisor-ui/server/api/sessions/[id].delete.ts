import { eq, and } from 'drizzle-orm'
import { chatSessions } from '../../db/schema'

/**
 * DELETE /api/sessions/:id — delete a session (messages cascade).
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  await db().delete(chatSessions).where(and(eq(chatSessions.id, id), eq(chatSessions.userId, userId)))

  setResponseStatus(event, 204)
  return null
})
