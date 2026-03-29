import { tool } from 'ai'
import { z } from 'zod'

/**
 * Creates a proposeDesignUpdate tool that the LLM calls to propose saving
 * a design decision or requirement. The tool does NOT write to the DB —
 * it returns the proposal for client-side rendering with Accept/Dismiss buttons.
 *
 * @returns AI SDK tool definition
 */
export function createProposeDesignUpdateTool () {
  return tool({
    description: `Propose saving a design decision or requirement to the user's architecture design.
Call this when the user clearly expresses a preference that matches a framework question.
Always confirm with the user before calling this tool.`,
    inputSchema: z.object({
      type: z.enum(['decision', 'requirement']),
      key: z.string().describe('The framework question key, e.g. "aks-mode"'),
      value: z.string().describe('The answer key, e.g. "automatic"'),
      question: z.string().describe('The human-readable question title, e.g. "Select AKS mode"'),
      label: z.string().describe('The human-readable answer label, e.g. "AKS Automatic"'),
    }),
    execute ({ type, key, value, question, label }) {
      // No DB write — just return the proposal for client rendering.
      // Intentionally does not validate key/value against the framework schema;
      // invalid values will fail silently when the client calls the PATCH endpoint.
      return Promise.resolve({ type, key, value, question, label })
    },
  })
}
