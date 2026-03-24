import { describe, it, expect } from 'vitest'
import { renderInlineBoldText } from './render-inline-bold-text'

describe('renderInlineBoldText', () => {
  it('wraps **bold** text in <strong> tags', () => {
    expect(renderInlineBoldText('This is **bold** text')).toBe('This is <strong>bold</strong> text')
  })

  it('handles multiple bold segments', () => {
    expect(renderInlineBoldText('**one** and **two**')).toBe('<strong>one</strong> and <strong>two</strong>')
  })

  it('returns plain text unchanged', () => {
    expect(renderInlineBoldText('no bold here')).toBe('no bold here')
  })

  it('handles empty string', () => {
    expect(renderInlineBoldText('')).toBe('')
  })

  it('does not match single asterisks', () => {
    expect(renderInlineBoldText('*italic* text')).toBe('*italic* text')
  })
})
