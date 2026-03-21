import { describe, it, expect } from 'vitest'
import type { UIMessage } from 'ai'
import { getSourcesMeta } from './get-sources-meta'

function msg (metadata?: Record<string, unknown>): UIMessage {
  return { id: '1', role: 'assistant', parts: [], metadata } as UIMessage
}

describe('getSourcesMeta', () => {
  it('extracts sources from metadata', () => {
    const sources = [
      { url: 'https://learn.microsoft.com/aks', title: 'AKS Docs' },
      { url: 'https://kubernetes.io/docs', title: 'K8s Docs' },
    ]
    expect(getSourcesMeta(msg({ sources }))).toEqual(sources)
  })

  it('returns empty array when metadata is undefined', () => {
    expect(getSourcesMeta(msg())).toEqual([])
  })

  it('returns empty array when sources key is missing', () => {
    expect(getSourcesMeta(msg({ reformulatedQuery: 'test' }))).toEqual([])
  })

  it('returns empty array when sources is null', () => {
    expect(getSourcesMeta(msg({ sources: null }))).toEqual([])
  })
})
