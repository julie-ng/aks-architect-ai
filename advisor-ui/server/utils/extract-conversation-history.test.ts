import { describe, it, expect } from 'vitest'
import type { UIMessage } from 'ai'
import { extractConversationHistory } from './extract-conversation-history'

function msg (role: string, text: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role: role as UIMessage['role'],
    parts: [{ type: 'text' as const, text }],
  }
}

describe('extractConversationHistory', () => {
  it('excludes the last user message', () => {
    const last = msg('user', 'current question')
    const messages = [msg('user', 'first'), msg('assistant', 'reply'), last]
    const result = extractConversationHistory(messages, last)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.content)).not.toContain('current question')
  })

  it('only includes user and assistant roles', () => {
    const last = msg('user', 'question')
    const messages = [
      msg('user', 'hello'),
      msg('assistant', 'hi'),
      { id: '1', role: 'system' as UIMessage['role'], parts: [{ type: 'text' as const, text: 'system msg' }] },
      last,
    ]
    const result = extractConversationHistory(messages, last)
    expect(result).toHaveLength(2)
  })

  it('filters out messages with empty text content', () => {
    const last = msg('user', 'question')
    const messages = [msg('user', ''), msg('assistant', 'reply'), last]
    const result = extractConversationHistory(messages, last)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('reply')
  })

  it('returns at most 6 entries', () => {
    const last = msg('user', 'question')
    const messages = Array.from({ length: 10 }, (_, i) => msg('user', `msg ${i}`))
    messages.push(last)
    const result = extractConversationHistory(messages, last)
    expect(result).toHaveLength(6)
  })

  it('returns empty array when only the current message exists', () => {
    const last = msg('user', 'question')
    const result = extractConversationHistory([last], last)
    expect(result).toEqual([])
  })

  it('concatenates multiple text parts', () => {
    const last = msg('user', 'question')
    const multiPart: UIMessage = {
      id: '1',
      role: 'user',
      parts: [
        { type: 'text' as const, text: 'hello ' },
        { type: 'text' as const, text: 'world' },
      ],
    }
    const result = extractConversationHistory([multiPart, last], last)
    expect(result[0].content).toBe('hello world')
  })
})
