import { z } from 'zod'
import { eq, max } from 'drizzle-orm'
import { appendMessagesSchema } from '~~/shared/utils/zod-schemas'
import { chatMessages, chatSessions } from '../../../db/schema'

/**
 * POST /api/sessions/:id/messages — append new messages to a session.
 * Deduplicates by message ID so repeated calls are safe.
 */
export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'id')!

  const result = await readValidatedBody(event, body => appendMessagesSchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.treeifyError(result.error),
    }
  }

  const incoming = result.data.messages
  if (incoming.length === 0) {
    return { inserted: 0 }
  }

  const database = db()

  // Find existing message IDs to skip duplicates
  const existingIds = new Set(
    (await database.select({ id: chatMessages.id })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
    ).map(r => r.id),
  )

  const newMessages = incoming.filter(m => !existingIds.has(m.id))
  if (newMessages.length === 0) {
    return { inserted: 0 }
  }

  // Get the current max sort_order
  const [{ maxOrder }] = await database
    .select({ maxOrder: max(chatMessages.sortOrder) })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))

  const offset = (maxOrder ?? -1) + 1

  // Insert new messages and update session timestamp in a transaction
  await database.transaction(async (tx) => {
    await tx.insert(chatMessages).values(
      newMessages.map((m, i) => ({
        id: m.id,
        sessionId,
        role: m.role,
        parts: m.parts,
        metadata: m.metadata ?? null,
        sortOrder: offset + i,
      })),
    )
    await tx.update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId))
  })

  return { inserted: newMessages.length }
})
