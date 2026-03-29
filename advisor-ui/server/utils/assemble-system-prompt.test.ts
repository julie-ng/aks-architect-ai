import { describe, it, expect } from 'vitest'
import { assembleSystemPrompt } from './assemble-system-prompt'

describe('assembleSystemPrompt', () => {
  it('wraps RAG context in <context> tags', () => {
    const result = assembleSystemPrompt('You are helpful.', 'chunk content')
    expect(result).toBe('You are helpful.\n\n<context>\nchunk content\n</context>')
  })

  it('appends design context in <design> tags when provided', () => {
    const result = assembleSystemPrompt('You are helpful.', 'chunks', { designContext: 'decisions here' })
    expect(result).toContain('<context>\nchunks\n</context>')
    expect(result).toContain('<design>')
    expect(result).toContain('decisions here')
    expect(result).toContain('Tailor your advice')
  })

  it('omits design section when options is undefined', () => {
    const result = assembleSystemPrompt('base', 'chunks')
    expect(result).not.toContain('<design>')
  })

  it('omits design section when designContext is empty string', () => {
    const result = assembleSystemPrompt('base', 'chunks', { designContext: '' })
    expect(result).not.toContain('<design>')
  })

  it('appends design-change signal when designChanged is true', () => {
    const result = assembleSystemPrompt('base', 'chunks', { designContext: 'decisions here', designChanged: true })
    expect(result).toContain('<design-change>')
    expect(result).toContain('</design-change>')
  })

  it('omits design-change signal when designChanged is false', () => {
    const result = assembleSystemPrompt('base', 'chunks', { designContext: 'decisions here', designChanged: false })
    expect(result).not.toContain('<design-change>')
  })

  it('omits design-change signal when designChanged is undefined', () => {
    const result = assembleSystemPrompt('base', 'chunks', { designContext: 'decisions here' })
    expect(result).not.toContain('<design-change>')
  })

  it('omits design-change signal when designContext is empty even if designChanged is true', () => {
    const result = assembleSystemPrompt('base', 'chunks', { designContext: '', designChanged: true })
    expect(result).not.toContain('<design-change>')
  })

  it('appends framework schema in <framework> tags when provided', () => {
    const result = assembleSystemPrompt('base', 'chunks', { frameworkSchema: '- aks-mode: automatic, standard' })
    expect(result).toContain('<framework>')
    expect(result).toContain('- aks-mode: automatic, standard')
    expect(result).toContain('proposeDesignUpdate')
    expect(result).toContain('</framework>')
  })

  it('omits framework section when frameworkSchema is empty', () => {
    const result = assembleSystemPrompt('base', 'chunks', { frameworkSchema: '' })
    expect(result).not.toContain('<framework>')
  })

  it('omits framework section when frameworkSchema is undefined', () => {
    const result = assembleSystemPrompt('base', 'chunks', {})
    expect(result).not.toContain('<framework>')
  })
})
