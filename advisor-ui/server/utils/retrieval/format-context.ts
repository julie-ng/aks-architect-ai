import type { RetrieveChunk } from '../../types/retrieval'

/**
 * Formats retrieved chunks into a numbered context string for the system prompt.
 * Each chunk is rendered with its index, title, URL, and text, separated by `---`.
 */
export function formatContext (chunks: RetrieveChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] ${c.title}\nURL: ${c.url}\n${c.text}`)
    .join('\n\n---\n\n')
}
