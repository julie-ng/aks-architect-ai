import { eq } from 'drizzle-orm'
// Drizzle table definition for the designs table
import { designs } from '../db/schema'

/**
 * Fetches a design's requirements and decisions from the DB,
 * then formats them as human-readable text for LLM consumption.
 * Returns an empty string if the design doesn't exist or has no data.
 *
 * @param designId - The design UUID to look up
 * @returns Formatted design context string, or empty string
 */
export async function fetchDesignContext (designId: string): Promise<string> {
  const [design] = await db().select({
    requirements: designs.requirements,
    decisions: designs.decisions,
  }).from(designs).where(eq(designs.id, designId))

  if (!design) return ''

  return formatDesignContext(
    design.requirements as Record<string, string | string[]>,
    design.decisions as Record<string, string | string[]>,
  )
}
