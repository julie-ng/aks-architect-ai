import type { UIMessage } from 'ai'

/**
 * Renders text with inline citation links by replacing footnote markers
 * (e.g. [1], [2]) with styled markdown links using the message's source metadata.
 * Returns the original text unchanged for non-assistant messages or when no sources exist.
 */
export function renderCitedText (part: { type: 'text', text: string }, message: UIMessage): string {
  if (message.role !== 'assistant') return part.text
  const sources = getSourcesMeta(message)
  if (!sources.length) return part.text
  return replaceFootnotesWithCitations(part.text, sources)
}
