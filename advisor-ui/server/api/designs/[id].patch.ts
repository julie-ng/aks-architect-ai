import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { updateDesignSchema } from '~~/shared/utils/zod-schemas'
import { designs } from '../../db/schema'

/**
 * PATCH /api/designs/:id — update design title and/or description.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  const result = await readValidatedBody(event, body => updateDesignSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.treeifyError(result.error),
    }
  }

  const [design] = await db().update(designs)
    .set({ ...result.data, updatedAt: new Date() })
    .where(and(eq(designs.id, id), eq(designs.userId, userId)))
    .returning()

  if (!design) {
    throw createError({ statusCode: 404, message: 'Design not found' })
  }

  return design
})
