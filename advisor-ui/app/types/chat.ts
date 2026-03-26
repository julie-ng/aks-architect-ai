import type { UIMessage } from 'ai'

export interface ChatSession {
  id: string
  title: string
  designId?: string | null
  createdAt: string
  updatedAt: string
  messages: UIMessage[]
}
