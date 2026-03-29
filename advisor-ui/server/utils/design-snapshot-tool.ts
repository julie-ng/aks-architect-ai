import { tool } from 'ai'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { designs } from '../db/schema'

/**
 * Creates a getDesignSnapshot tool that fetches the user's architecture
 * design (requirements + decisions) from the database.
 * The designId is captured in the closure — no input params needed.
 */
export function createDesignSnapshotTool (designId: string) {
  return tool({
    description: `Retrieve the current AKS architecture design snapshot including requirements and decisions.
Call this when:
- The system prompt contains a <design-change> signal (ALWAYS call in this case)
- The user asks about their design choices
- You need to reference their architecture configuration`,
    inputSchema: z.object({}),
    async execute () {
      const [design] = await db().select({
        title: designs.title,
        requirements: designs.requirements,
        decisions: designs.decisions,
      }).from(designs).where(eq(designs.id, designId))

      if (!design) {
        return { found: false as const, designId, title: null, requirements: {}, decisions: {} }
      }

      return {
        found: true as const,
        designId,
        title: design.title,
        requirements: design.requirements as Record<string, string | string[]>,
        decisions: design.decisions as Record<string, string | string[]>,
      }
    },
  })
}
