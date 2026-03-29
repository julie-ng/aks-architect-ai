import { z } from 'zod'
import { createSessionSchema } from '~~/shared/utils/zod-schemas'
import { chatSessions } from '../../db/schema'

/**
 * POST /api/sessions — create a new chat session.
 */
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)

  const result = await readValidatedBody(event, body => createSessionSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.treeifyError(result.error),
    }
  }

  const { id, title, designId } = result.data
  logger.info({ sessionId: id, designId: designId ?? null }, 'session created')

  const [session] = await db().insert(chatSessions).values({
    id,
    userId,
    ...(title ? { title } : {}),
    ...(designId ? { designId } : {}),
  }).returning()

  setResponseStatus(event, 201)
  return session
})
