import { humanizeSlug } from '~~/shared/utils/humanize-slug'

type DesignFields = Record<string, string | string[]>

/**
 * Formats a design's requirements and decisions into plain text for LLM consumption.
 * Injected into the system prompt so the model has the user's architecture context
 * before the conversation starts. Slug keys and values are humanized for readability.
 *
 * @param requirements - User's architecture requirements (e.g. compliance frameworks, org type)
 * @param decisions - User's architectural decisions (e.g. network model, ingress controller)
 * @returns Plain text block with "Requirements:" and "Architectural Decisions:" sections
 */
export function formatDesignContext (
  requirements: DesignFields,
  decisions: DesignFields,
): string {
  const parts: string[] = []
  if (Object.keys(requirements).length > 0) {
    parts.push(`Requirements:\n${_formatRecord(requirements)}`)
  }
  if (Object.keys(decisions).length > 0) {
    parts.push(`Architectural Decisions:\n${_formatRecord(decisions)}`)
  }
  return parts.join('\n\n')
}

function _formatRecord (record: DesignFields): string {
  return Object.entries(record)
    .map(([key, val]) => {
      const label = humanizeSlug(key)
      const value = Array.isArray(val)
        ? val.map(v => humanizeSlug(v)).join(', ')
        : humanizeSlug(val)
      return `- ${label}: ${value}`
    })
    .join('\n')
}
