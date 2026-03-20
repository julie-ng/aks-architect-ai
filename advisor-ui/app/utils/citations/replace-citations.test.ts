import { describe, it, expect } from 'vitest'
import { replaceCitations, getCitationClass } from './replace-citations'
import type { SourceMeta } from './replace-citations'

const sources: SourceMeta[] = [
  { url: 'https://learn.microsoft.com/aks/networking', title: 'AKS Networking - Microsoft Learn' },
  { url: 'https://kubernetes.io/docs/concepts/services', title: 'Kubernetes Services' },
  { url: 'https://example.com/guide', title: 'Some Guide' },
]

describe('getCitationClass', () => {
  it('returns msft class for learn.microsoft.com', () => {
    expect(getCitationClass('https://learn.microsoft.com/foo')).toBe('citation citation-msft')
  })

  it('returns msft class for azure.microsoft.com', () => {
    expect(getCitationClass('https://azure.microsoft.com/pricing')).toBe('citation citation-msft')
  })

  it('returns k8s class for kubernetes.io', () => {
    expect(getCitationClass('https://kubernetes.io/docs')).toBe('citation citation-k8s')
  })

  it('returns web fallback for unknown domains', () => {
    expect(getCitationClass('https://example.com/page')).toBe('citation citation-web')
  })

  it('returns fallback for invalid URL', () => {
    expect(getCitationClass('not-a-url')).toBe('citation citation-web')
  })
})

describe('replaceCitations', () => {
  it('replaces a single citation with MDC link', () => {
    const result = replaceCitations('See [1] for details.', sources)
    expect(result).toBe('See [AKS Networking](https://learn.microsoft.com/aks/networking){.citation .citation-msft} for details.')
  })

  it('replaces multiple citations', () => {
    const result = replaceCitations('Compare [1] and [2].', sources)
    expect(result).toContain('[AKS Networking]')
    expect(result).toContain('[Kubernetes Services]')
  })

  it('handles citation at end of sentence', () => {
    const result = replaceCitations('Read this [1].', sources)
    expect(result).toBe('Read this [AKS Networking](https://learn.microsoft.com/aks/networking){.citation .citation-msft}.')
  })

  it('handles adjacent citations', () => {
    const result = replaceCitations('See [1][2] for more.', sources)
    expect(result).toContain('[AKS Networking]')
    expect(result).toContain('[Kubernetes Services]')
  })

  it('leaves out-of-range citation index as-is', () => {
    const result = replaceCitations('See [99] here.', sources)
    expect(result).toBe('See [99] here.')
  })

  it('returns text unchanged for empty sources', () => {
    const text = 'No sources [1] here.'
    expect(replaceCitations(text, [])).toBe(text)
  })

  it('does not replace citations inside fenced code blocks', () => {
    const text = 'See [1].\n\n```\ncode [1] here\n```'
    const result = replaceCitations(text, sources)
    expect(result).toContain('code [1] here')
    expect(result).toContain('[AKS Networking]')
  })

  it('does not replace citations inside inline code', () => {
    const text = 'Use `config [1]` and see [1].'
    const result = replaceCitations(text, sources)
    expect(result).toContain('`config [1]`')
    expect(result).toContain('[AKS Networking]')
  })

  it('applies correct domain class', () => {
    const result = replaceCitations('[3]', sources)
    expect(result).toContain('.citation-web')
  })

  it('shortens titles via shortenTitle', () => {
    const result = replaceCitations('[1]', sources)
    // " - Microsoft Learn" suffix should be stripped
    expect(result).toContain('[AKS Networking]')
    expect(result).not.toContain('Microsoft Learn')
  })

  it('escapes special markdown characters in titles', () => {
    const specialSources: SourceMeta[] = [
      { url: 'https://example.com', title: 'Title [with] (parens)' },
    ]
    const result = replaceCitations('[1]', specialSources)
    expect(result).toContain('\\[with\\]')
    expect(result).toContain('\\(parens\\)')
  })
})
