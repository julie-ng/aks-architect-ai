import type { UIMessage } from 'ai'

/**
 * Returns only the sources that are actually cited (e.g. [1], [2]) in the message text.
 */
export function getCitedSources (message: UIMessage): SourceMeta[] {
  const sources = getSourcesMeta(message)
  if (!sources.length) return []

  const text = message.parts
    .filter(p => p.type === 'text')
    .map(p => (p as { type: 'text', text: string }).text)
    .join('')

  return sources.filter((_, i) => text.includes(`[${i + 1}]`))
}
