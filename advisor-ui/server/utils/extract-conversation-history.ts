import type { UIMessage } from 'ai'

interface HistoryEntry {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Extracts recent conversation history for context-aware query reformulation.
 * Returns the last 6 text-only messages (excluding the current question),
 * so the reformulator can resolve references like "tell me more about that".
 *
 * @param messages - The full message array from AI SDK
 * @param lastUserMessage - The current user message to exclude
 * @returns Array of recent history entries with role and content
 */
export function extractConversationHistory (
  messages: UIMessage[],
  lastUserMessage: UIMessage,
): HistoryEntry[] {
  return messages
    .filter((m) => m !== lastUserMessage)
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.parts?.filter((p) => p.type === 'text').map((p) => p.text).join('') ?? '',
    }))
    .filter((m) => m.content.length > 0)
    .slice(-6)
}
