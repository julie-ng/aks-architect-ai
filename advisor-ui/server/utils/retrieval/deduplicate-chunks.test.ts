import { describe, it, expect } from 'vitest'
import { deduplicateChunks } from './deduplicate-chunks'
import type { RetrieveChunk } from '../../types/retrieval'

const chunk = (overrides: Partial<RetrieveChunk> = {}): RetrieveChunk => ({
  id: '1',
  title: 'AKS Networking',
  url: 'https://learn.microsoft.com/aks/networking',
  score: 0.9,
  boosted_score: 0.95,
  text: 'Content about networking.',
  tags: {},
  priority: 10,
  ...overrides,
})

describe('deduplicateChunks', () => {
  it('keeps chunks with unique URLs', () => {
    const chunks = [
      chunk({ url: 'https://example.com/a' }),
      chunk({ url: 'https://example.com/b' }),
    ]
    expect(deduplicateChunks(chunks)).toHaveLength(2)
  })

  it('removes duplicate URLs, keeping first occurrence', () => {
    const chunks = [
      chunk({ url: 'https://example.com/a', title: 'First' }),
      chunk({ url: 'https://example.com/a', title: 'Second' }),
    ]
    const result = deduplicateChunks(chunks)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('First')
  })

  it('returns empty array for empty input', () => {
    expect(deduplicateChunks([])).toEqual([])
  })

  it('handles mix of unique and duplicate URLs', () => {
    const chunks = [
      chunk({ url: 'https://example.com/a' }),
      chunk({ url: 'https://example.com/b' }),
      chunk({ url: 'https://example.com/a' }),
      chunk({ url: 'https://example.com/c' }),
      chunk({ url: 'https://example.com/b' }),
    ]
    const result = deduplicateChunks(chunks)
    expect(result).toHaveLength(3)
    expect(result.map(c => c.url)).toEqual([
      'https://example.com/a',
      'https://example.com/b',
      'https://example.com/c',
    ])
  })
})
