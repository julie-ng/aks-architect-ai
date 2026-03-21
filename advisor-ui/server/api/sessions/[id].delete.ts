import { eq } from 'drizzle-orm'
import { chatSessions } from '../../db/schema'

/**
 * DELETE /api/sessions/:id — delete a session (messages cascade).
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  await db().delete(chatSessions).where(eq(chatSessions.id, id))

  setResponseStatus(event, 204)
  return null
})
