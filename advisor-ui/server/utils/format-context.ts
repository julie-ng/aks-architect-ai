import type { RetrieveChunk } from '../types/retrieval'

/**
 * Formats retrieved RAG chunks into a numbered context block for the system prompt.
 * Each chunk is rendered with its 1-based index, title, URL, and text, separated by `---`.
 * The index numbers correspond to citation markers (e.g. [1], [2]) the LLM uses in responses.
 *
 * @param chunks - Retrieved chunks from the retrieval API (Qdrant vector search results)
 * @returns Formatted text block ready for system prompt injection
 */
export function formatContext (chunks: RetrieveChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] ${c.title}\nURL: ${c.url}\n${c.text}`)
    .join('\n\n---\n\n')
}
