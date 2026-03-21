import type { UIMessage } from 'ai'
import type { ChatSession } from '~/types/chat'
import { useLocalStorage } from '@vueuse/core'
import { defineStore, skipHydrate } from 'pinia'

export const useChatsStore = defineStore('chats', () => {
  const config = useAppConfig()
  const sessions = useLocalStorage<Record<string, ChatSession>>(config.localStorageKey, {})

  // --- Getters ---

  const sortedSessions = computed(() =>
    Object.values(sessions.value).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  )

  const hasSessions = computed(() => sortedSessions.value.length > 0)

  const latestSession = computed(() => sortedSessions.value[0])

  const getSession = computed(() =>
    (id: string): ChatSession | undefined => sessions.value[id],
  )

  const sessionPath = computed(() =>
    (id: string): string => `/chat/${id}`,
  )

  // --- Actions ---

  function newSession (): ChatSession {
    return createSession(crypto.randomUUID())
  }

  function createSession (id: string): ChatSession {
    const now = new Date().toISOString()
    const session: ChatSession = {
      id,
      title: '(untitled chat)',
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
    // Deep clone to strip Vue reactivity proxies before localStorage serialization
    const plainMessages = JSON.parse(JSON.stringify(messages)) as UIMessage[]
    sessions.value = {
      ...sessions.value,
      [id]: { ...session, messages: plainMessages, updatedAt: new Date().toISOString() },
    }
  }

  function setTitle (id: string, title: string): void {
    const session = sessions.value[id]
    if (!session || session.title !== '(untitled chat)') return
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

  return {
    // State
    sessions: skipHydrate(sessions),

    // Getters
    sortedSessions,
    hasSessions,
    latestSession,
    getSession,
    sessionPath,

    // Actions
    newSession,
    createSession,
    updateMessages,
    setTitle,
    renameSession,
    deleteSession,
  }
})
