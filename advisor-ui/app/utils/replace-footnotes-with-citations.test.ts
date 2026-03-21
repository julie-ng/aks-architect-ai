import { describe, it, expect, vi } from 'vitest'
import { replaceFootnotesWithCitations } from './replace-footnotes-with-citations'
import type { SourceMeta } from './replace-footnotes-with-citations'

// Mock Nuxt auto-imports used by the module
vi.stubGlobal('useAppConfig', () => ({
  citations: {
    base: 'citation',
    domains: {
      'learn.microsoft.com': 'citation-msft',
      'azure.microsoft.com': 'citation-msft',
      'kubernetes.io': 'citation-k8s',
    },
    fallback: 'citation-web',
  },
}))

vi.stubGlobal('escapeMarkdownLinkText', (await import('./escape-markdown-link-text')).escapeMarkdownLinkText)
vi.stubGlobal('shortenCitationTitle', (await import('./shorten-citation-title')).shortenCitationTitle)

const sources: SourceMeta[] = [
  { url: 'https://learn.microsoft.com/aks/networking', title: 'AKS Networking - Microsoft Learn' },
  { url: 'https://kubernetes.io/docs/concepts/services', title: 'Kubernetes Services' },
  { url: 'https://example.com/guide', title: 'Some Guide' },
]

describe('replaceFootnotesWithCitations', () => {
  it('replaces a single citation with MDC link', () => {
    const result = replaceFootnotesWithCitations('See [1] for details.', sources)
    expect(result).toBe('See [AKS Networking](https://learn.microsoft.com/aks/networking){.citation .citation-msft} for details.')
  })

  it('replaces multiple citations', () => {
    const result = replaceFootnotesWithCitations('Compare [1] and [2].', sources)
    expect(result).toContain('[AKS Networking]')
    expect(result).toContain('[Kubernetes Services]')
  })

  it('handles citation at end of sentence', () => {
    const result = replaceFootnotesWithCitations('Read this [1].', sources)
    expect(result).toBe('Read this [AKS Networking](https://learn.microsoft.com/aks/networking){.citation .citation-msft}.')
  })

  it('handles adjacent citations', () => {
    const result = replaceFootnotesWithCitations('See [1][2] for more.', sources)
    expect(result).toContain('[AKS Networking]')
    expect(result).toContain('[Kubernetes Services]')
  })

  it('leaves out-of-range citation index as-is', () => {
    const result = replaceFootnotesWithCitations('See [99] here.', sources)
    expect(result).toBe('See [99] here.')
  })

  it('returns text unchanged for empty sources', () => {
    const text = 'No sources [1] here.'
    expect(replaceFootnotesWithCitations(text, [])).toBe(text)
  })

  it('does not replace citations inside fenced code blocks', () => {
    const text = 'See [1].\n\n```\ncode [1] here\n```'
    const result = replaceFootnotesWithCitations(text, sources)
    expect(result).toContain('code [1] here')
    expect(result).toContain('[AKS Networking]')
  })

  it('does not replace citations inside inline code', () => {
    const text = 'Use `config [1]` and see [1].'
    const result = replaceFootnotesWithCitations(text, sources)
    expect(result).toContain('`config [1]`')
    expect(result).toContain('[AKS Networking]')
  })

  it('applies correct domain class', () => {
    const result = replaceFootnotesWithCitations('[3]', sources)
    expect(result).toContain('.citation-web')
  })

  it('shortens titles via shortenCitationTitle', () => {
    const result = replaceFootnotesWithCitations('[1]', sources)
    expect(result).toContain('[AKS Networking]')
    expect(result).not.toContain('Microsoft Learn')
  })

  it('escapes special markdown characters in titles', () => {
    const specialSources: SourceMeta[] = [
      { url: 'https://example.com', title: 'Title [with] (parens)' },
    ]
    const result = replaceFootnotesWithCitations('[1]', specialSources)
    expect(result).toContain('\\[with\\]')
    expect(result).toContain('\\(parens\\)')
  })
})
