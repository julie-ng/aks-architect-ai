import { describe, it, expect } from 'vitest'
import { formatContext } from './format-context'
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

describe('formatContext', () => {
  it('formats a single chunk with index, title, URL, and text', () => {
    const result = formatContext([chunk()])
    expect(result).toBe('[1] AKS Networking\nURL: https://learn.microsoft.com/aks/networking\nContent about networking.')
  })

  it('numbers chunks sequentially starting from 1', () => {
    const chunks = [
      chunk({ title: 'First', url: 'https://example.com/1', text: 'A' }),
      chunk({ title: 'Second', url: 'https://example.com/2', text: 'B' }),
    ]
    const result = formatContext(chunks)
    expect(result).toContain('[1] First')
    expect(result).toContain('[2] Second')
  })

  it('separates chunks with --- divider', () => {
    const chunks = [
      chunk({ text: 'A' }),
      chunk({ text: 'B' }),
    ]
    const result = formatContext(chunks)
    expect(result).toContain('\n\n---\n\n')
  })

  it('returns empty string for empty array', () => {
    expect(formatContext([])).toBe('')
  })
})
