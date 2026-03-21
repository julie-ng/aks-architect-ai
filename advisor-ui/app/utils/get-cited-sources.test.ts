import { describe, it, expect, vi } from 'vitest'
import type { UIMessage } from 'ai'

// Stub Nuxt auto-imports
vi.stubGlobal('getSourcesMeta', (await import('./get-sources-meta')).getSourcesMeta)

// SourceMeta type isn't available at runtime — getCitedSources only needs the shape
const { getCitedSources } = await import('./get-cited-sources')

const sources = [
  { url: 'https://learn.microsoft.com/aks', title: 'AKS Docs' },
  { url: 'https://kubernetes.io/docs', title: 'K8s Docs' },
  { url: 'https://example.com/guide', title: 'Guide' },
]

function msg (text: string, meta?: Record<string, unknown>): UIMessage {
  return {
    id: '1',
    role: 'assistant',
    parts: [{ type: 'text', text }],
    metadata: meta,
  } as UIMessage
}

describe('getCitedSources', () => {
  it('returns only sources that are cited in text', () => {
    const result = getCitedSources(msg('See [1] and [3].', { sources }))
    expect(result).toEqual([sources[0], sources[2]])
  })

  it('returns all sources when all are cited', () => {
    const result = getCitedSources(msg('Refs [1], [2], [3].', { sources }))
    expect(result).toEqual(sources)
  })

  it('returns empty array when no citations in text', () => {
    const result = getCitedSources(msg('No citations here.', { sources }))
    expect(result).toEqual([])
  })

  it('returns empty array when no sources in metadata', () => {
    const result = getCitedSources(msg('See [1].'))
    expect(result).toEqual([])
  })

  it('handles multiple text parts', () => {
    const message = {
      id: '1',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'First part [1].' },
        { type: 'text', text: 'Second part [3].' },
      ],
      metadata: { sources },
    } as UIMessage
    const result = getCitedSources(message)
    expect(result).toEqual([sources[0], sources[2]])
  })

  it('ignores out-of-range citation numbers', () => {
    const result = getCitedSources(msg('See [1] and [99].', { sources }))
    expect(result).toEqual([sources[0]])
  })
})
