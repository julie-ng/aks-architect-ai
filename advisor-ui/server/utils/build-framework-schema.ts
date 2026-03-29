import type { H3Event } from 'h3'
import type { SpecEntry } from '~~/shared/types/spec'

let _cachedSchema: string | null = null

/**
 * Loads the design framework schema (decisions + requirements) from content
 * collections and formats as compact text for LLM system prompt injection.
 * Result is cached after the first call since schema is static content.
 *
 * @param event - H3 event (required by queryCollection on first call)
 * @returns Formatted framework schema text
 */
export async function buildFrameworkSchema (event: H3Event): Promise<string> {
  if (_cachedSchema) {
    return _cachedSchema
  }

  const [decisionEntries, requirementEntries] = await Promise.all([
    queryCollection(event, 'decisions').select('path', 'spec').all() as unknown as Promise<SpecEntry[]>,
    queryCollection(event, 'requirements').select('path', 'spec').all() as unknown as Promise<SpecEntry[]>,
  ])

  const lines: string[] = []

  lines.push('### Decisions')
  for (const entry of decisionEntries) {
    const key = entry.path.split('/').pop()!
    const answers = entry.spec.answers
      .filter(a => !a.disabled)
      .map(a => a.key)
      .join(', ')
    lines.push(`- ${key} (${entry.spec.question_type}): "${entry.spec.title}" → ${answers}`)
  }

  lines.push('')
  lines.push('### Requirements')
  for (const entry of requirementEntries) {
    const key = entry.path.split('/').pop()!
    const answers = entry.spec.answers
      .filter(a => !a.disabled)
      .map(a => a.key)
      .join(', ')
    lines.push(`- ${key} (${entry.spec.question_type}): "${entry.spec.title}" → ${answers}`)
  }

  _cachedSchema = lines.join('\n')
  return _cachedSchema
}
