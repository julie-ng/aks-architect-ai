import type { UIMessage } from 'ai'
import type { ChatSession } from '~/types/chat'
import { useLocalStorage } from '@vueuse/core'

export const useChatSessionsStore = defineStore('chatSessions', () => {
  const sessions = useLocalStorage<Record<string, ChatSession>>('chat-sessions', {})

  const sortedSessions = computed(() =>
    Object.values(sessions.value).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  )

  function createSession (id: string): ChatSession {
    const now = new Date().toISOString()
    const session: ChatSession = {
      id,
      title: 'New chat',
      createdAt: now,
      updatedAt: now,
      messages: [],
    }
    sessions.value = { ...sessions.value, [id]: session }
    return session
  }

  function updateMessages (id: string, messages: UIMessage[]): void {
    const session = sessions.value[id]
    if (!session) return
    sessions.value = {
      ...sessions.value,
      [id]: { ...session, messages, updatedAt: new Date().toISOString() },
    }
  }

  function setTitle (id: string, title: string): void {
    const session = sessions.value[id]
    if (!session || session.title !== 'New chat') return
    sessions.value = {
      ...sessions.value,
      [id]: { ...session, title },
    }
  }

  function renameSession (id: string, title: string): void {
    const session = sessions.value[id]
    if (!session) return
    sessions.value = {
      ...sessions.value,
      [id]: { ...session, title },
    }
  }

  function deleteSession (id: string): void {
    // eslint-disable-next-line no-unused-vars
    const { [id]: _removed, ...rest } = sessions.value
    sessions.value = rest
  }

  function getSession (id: string): ChatSession | undefined {
    return sessions.value[id]
  }

  return { sessions, sortedSessions, createSession, updateMessages, setTitle, renameSession, deleteSession, getSession }
})
