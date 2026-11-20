import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UIMessage } from 'ai'

const getSourcesMeta = vi.fn()
const replaceFootnotesWithCitations = vi.fn()

// Mock Nuxt auto-imports used by the module
vi.stubGlobal('getSourcesMeta', getSourcesMeta)
vi.stubGlobal('replaceFootnotesWithCitations', replaceFootnotesWithCitations)

const { renderCitedText } = await import('./render-cited-text')

const part = { type: 'text', text: 'See [1].' } as const

function messageWithRole (role: UIMessage['role']): UIMessage {
  return { role } as UIMessage
}

beforeEach(() => {
  getSourcesMeta.mockReset()
  replaceFootnotesWithCitations.mockReset()
})

describe('renderCitedText', () => {
  it('returns original text for non-assistant messages', () => {
    const result = renderCitedText(part, messageWithRole('user'))

    expect(result).toBe(part.text)
    expect(getSourcesMeta).not.toHaveBeenCalled()
    expect(replaceFootnotesWithCitations).not.toHaveBeenCalled()
  })

  it('returns original text when assistant has no sources', () => {
    getSourcesMeta.mockReturnValue([])

    const result = renderCitedText(part, messageWithRole('assistant'))

    expect(result).toBe(part.text)
    expect(getSourcesMeta).toHaveBeenCalledWith(expect.objectContaining({ role: 'assistant' }))
    expect(replaceFootnotesWithCitations).not.toHaveBeenCalled()
  })

  it('returns replaced text when assistant has sources', () => {
    const sources = [{ url: 'https://example.com', title: 'Example' }]
    getSourcesMeta.mockReturnValue(sources)
    replaceFootnotesWithCitations.mockReturnValue('Rendered text')

    const message = messageWithRole('assistant')
    const result = renderCitedText(part, message)

    expect(result).toBe('Rendered text')
    expect(getSourcesMeta).toHaveBeenCalledWith(message)
    expect(replaceFootnotesWithCitations).toHaveBeenCalledWith(part.text, sources)
  })
})
