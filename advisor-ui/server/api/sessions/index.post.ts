import { z } from 'zod'
import { createSessionSchema } from '~~/shared/utils/zod-schemas'
import { chatSessions } from '../../db/schema'

/**
 * POST /api/sessions — create a new chat session.
 */
export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => createSessionSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.treeifyError(result.error),
    }
  }

  const { id, title } = result.data

  const [session] = await db().insert(chatSessions).values({
    id,
    ...(title ? { title } : {}),
  }).returning()

  setResponseStatus(event, 201)
  return session
})
