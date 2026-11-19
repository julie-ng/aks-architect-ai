import { describe, it, expect } from 'vitest'
import { textCountColor } from './text-count-color'

describe('textCountColor', () => {
  it('returns text-error when answered is 0 and total is greater than 0', () => {
    expect(textCountColor(0, 5)).toBe('text-error')
  })

  it('returns text-error when answered and total are 0', () => {
    expect(textCountColor(0, 0)).toBe('text-error')
  })

  it('returns text-warning when answered does not equal total', () => {
    expect(textCountColor(2, 5)).toBe('text-warning')
  })

  it('returns text-success when answered equals total and is not 0', () => {
    expect(textCountColor(5, 5)).toBe('text-success')
  })
})
