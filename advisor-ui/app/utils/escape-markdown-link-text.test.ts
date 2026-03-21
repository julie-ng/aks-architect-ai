import { describe, it, expect } from 'vitest'
import { escapeMarkdownLinkText } from './escape-markdown-link-text'

describe('escapeMarkdownLinkText', () => {
  it('escapes square brackets', () => {
    expect(escapeMarkdownLinkText('Title [with] brackets')).toBe('Title \\[with\\] brackets')
  })

  it('escapes parentheses', () => {
    expect(escapeMarkdownLinkText('Title (with) parens')).toBe('Title \\(with\\) parens')
  })

  it('escapes mixed special characters', () => {
    expect(escapeMarkdownLinkText('[foo](bar)')).toBe('\\[foo\\]\\(bar\\)')
  })

  it('leaves plain text unchanged', () => {
    expect(escapeMarkdownLinkText('AKS Networking Overview')).toBe('AKS Networking Overview')
  })

  it('handles empty string', () => {
    expect(escapeMarkdownLinkText('')).toBe('')
  })
})
