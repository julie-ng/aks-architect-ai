import type { RetrieveChunk } from '../types/retrieval'

/**
 * Deduplicates chunks by URL, keeping only the first occurrence.
 */
export function deduplicateChunks (chunks: RetrieveChunk[]): RetrieveChunk[] {
  const seen = new Set<string>()
  return chunks.filter((c) => {
    if (seen.has(c.url)) return false
    seen.add(c.url)
    return true
  })
}
