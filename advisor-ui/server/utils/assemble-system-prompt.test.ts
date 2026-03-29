import { describe, it, expect } from 'vitest'
import { assembleSystemPrompt } from './assemble-system-prompt'

describe('assembleSystemPrompt', () => {
  it('wraps RAG context in <context> tags', () => {
    const result = assembleSystemPrompt('You are helpful.', 'chunk content')
    expect(result).toBe('You are helpful.\n\n<context>\nchunk content\n</context>')
  })

  it('appends design context in <design> tags when provided', () => {
    const result = assembleSystemPrompt('You are helpful.', 'chunks', 'decisions here')
    expect(result).toContain('<context>\nchunks\n</context>')
    expect(result).toContain('<design>')
    expect(result).toContain('decisions here')
    expect(result).toContain('Tailor your advice')
  })

  it('omits design section when designContext is undefined', () => {
    const result = assembleSystemPrompt('base', 'chunks')
    expect(result).not.toContain('<design>')
  })

  it('omits design section when designContext is empty string', () => {
    const result = assembleSystemPrompt('base', 'chunks', '')
    expect(result).not.toContain('<design>')
  })

  it('appends design-change signal when designChanged is true', () => {
    const result = assembleSystemPrompt('base', 'chunks', 'decisions here', true)
    expect(result).toContain('<design-change>')
    expect(result).toContain('MUST call the getDesignSnapshot tool')
    expect(result).toContain('</design-change>')
  })

  it('omits design-change signal when designChanged is false', () => {
    const result = assembleSystemPrompt('base', 'chunks', 'decisions here', false)
    expect(result).not.toContain('<design-change>')
  })

  it('omits design-change signal when designChanged is undefined', () => {
    const result = assembleSystemPrompt('base', 'chunks', 'decisions here')
    expect(result).not.toContain('<design-change>')
  })

  it('omits design-change signal when designContext is empty even if designChanged is true', () => {
    const result = assembleSystemPrompt('base', 'chunks', '', true)
    expect(result).not.toContain('<design-change>')
  })
})
