import { eq, and } from 'drizzle-orm'
import { designs } from '../../db/schema'

/**
 * GET /api/designs/:id — get a design with full requirements and decisions.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  const [design] = await db().select().from(designs)
    .where(and(eq(designs.id, id), eq(designs.userId, userId)))

  if (!design) {
    throw createError({ statusCode: 404, message: 'Design not found' })
  }

  return design
})
