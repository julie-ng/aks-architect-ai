import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { updateSelectionSchema } from '~~/shared/utils/zod-schemas'
import { designs } from '../../../db/schema'

/**
 * PATCH /api/designs/:id/decisions — update a single decision.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')!

  const result = await readValidatedBody(event, body => updateSelectionSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.treeifyError(result.error),
    }
  }

  const { key, value } = result.data

  const [design] = await db().select().from(designs)
    .where(and(eq(designs.id, id), eq(designs.userId, userId)))

  if (!design) {
    throw createError({ statusCode: 404, message: 'Design not found' })
  }

  const updated = { ...(design.decisions as Record<string, unknown>) }
  if (value === null) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete updated[key]
  }
  else {
    updated[key] = value
  }

  const [result_] = await db().update(designs)
    .set({ decisions: updated, updatedAt: new Date() })
    .where(and(eq(designs.id, id), eq(designs.userId, userId)))
    .returning()

  return result_
})
