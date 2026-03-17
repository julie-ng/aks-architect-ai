import type { UIMessage } from 'ai'

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: UIMessage[]
}
