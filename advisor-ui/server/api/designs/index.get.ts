import { desc, eq } from 'drizzle-orm'
import { designs } from '../../db/schema'

/**
 * GET /api/designs — list all designs (metadata only, no requirements/decisions).
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)

  const result = await db().select({
    id: designs.id,
    title: designs.title,
    description: designs.description,
    createdAt: designs.createdAt,
    updatedAt: designs.updatedAt,
  }).from(designs)
    .where(eq(designs.userId, userId))
    .orderBy(desc(designs.updatedAt))

  return result
})
