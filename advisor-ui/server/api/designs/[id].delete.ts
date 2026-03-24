import { eq, and } from 'drizzle-orm'
import { designs } from '../../db/schema'

/**
 * DELETE /api/designs/:id — delete a design.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  await db().delete(designs).where(and(eq(designs.id, id), eq(designs.userId, userId)))

  setResponseStatus(event, 204)
  return null
})
