import { describe, it, expect } from 'vitest'
import { humanizeSlug } from './humanize-slug'

describe('humanizeSlug', () => {
  it('converts a simple kebab-case slug', () => {
    expect(humanizeSlug('network-policy')).toBe('Network Policy')
  })

  it('converts a single word', () => {
    expect(humanizeSlug('networking')).toBe('Networking')
  })

  it('handles multiple hyphens', () => {
    expect(humanizeSlug('enable-multi-az')).toBe('Enable Multi Az')
  })

  it('handles already capitalized input', () => {
    expect(humanizeSlug('Azure-cni-overlay')).toBe('Azure Cni Overlay')
  })

  it('returns empty string for empty input', () => {
    expect(humanizeSlug('')).toBe('')
  })
})
