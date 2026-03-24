import { z } from 'zod'
import { createDesignSchema } from '~~/shared/utils/zod-schemas'
import { designs } from '../../db/schema'

/**
 * POST /api/designs — create a new design.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)

  const result = await readValidatedBody(event, body => createDesignSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.treeifyError(result.error),
    }
  }

  const { title, description, decisions, requirements } = result.data

  const [design] = await db().insert(designs).values({
    userId,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(decisions && Object.keys(decisions).length > 0 ? { decisions } : {}),
    ...(requirements && Object.keys(requirements).length > 0 ? { requirements } : {}),
  }).returning()

  setResponseStatus(event, 201)
  return design
})
