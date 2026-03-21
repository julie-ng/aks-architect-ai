import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { updateSessionSchema } from '~~/shared/utils/zod-schemas'
import { chatSessions } from '../../db/schema'

/**
 * PATCH /api/sessions/:id — update session title.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const result = await readValidatedBody(event, body => updateSessionSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.treeifyError(result.error),
    }
  }

  const [session] = await db().update(chatSessions)
    .set({ title: result.data.title, updatedAt: new Date() })
    .where(eq(chatSessions.id, id))
    .returning()

  if (!session) {
    throw createError({ statusCode: 404, message: 'Session not found' })
  }

  return session
})
