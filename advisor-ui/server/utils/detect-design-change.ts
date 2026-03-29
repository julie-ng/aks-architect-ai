import { eq } from 'drizzle-orm'
import { designs, chatSessions } from '../db/schema'

/**
 * Detects whether the linked design was updated after the last chat activity.
 * Compares `designs.updatedAt` against `chatSessions.updatedAt` (which is
 * updated in the same transaction as message inserts).
 *
 * @param designId - The linked design's UUID
 * @param sessionId - The chat session's UUID
 * @returns True if the design was modified after the last message
 */
export async function detectDesignChange (designId: string, sessionId: string): Promise<boolean> {
  const database = db()

  const [designRows, sessionRows] = await Promise.all([
    database.select({ updatedAt: designs.updatedAt })
      .from(designs)
      .where(eq(designs.id, designId)),
    database.select({ updatedAt: chatSessions.updatedAt })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId)),
  ])

  if (!designRows[0] || !sessionRows[0]) {
    return false
  }

  return designRows[0].updatedAt > sessionRows[0].updatedAt
}
