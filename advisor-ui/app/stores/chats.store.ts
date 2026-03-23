import type { UIMessage } from 'ai'
import type { ChatSession } from '~/types/chat'
import { defineStore } from 'pinia'

export const useChatsStore = defineStore('chats', () => {
  const { chat: chatConfig } = useAppConfig()
  const sessions = ref<Record<string, ChatSession>>({})
  const loaded = ref(false)

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

  async function fetchSessions (): Promise<void> {
    if (loaded.value) return
    const data = await $fetch<Array<{ id: string, title: string, createdAt: string, updatedAt: string }>>('/api/sessions')
    const record: Record<string, ChatSession> = {}
    for (const s of data) {
      record[s.id] = { ...s, messages: [] }
    }
    sessions.value = record
    loaded.value = true
  }

  async function fetchSession (id: string): Promise<ChatSession> {
    const data = await $fetch<ChatSession>(`/api/sessions/${id}`)
    sessions.value = {
      ...sessions.value,
      [id]: data,
    }
    return data
  }

  async function newSession (): Promise<ChatSession> {
    return createSession(crypto.randomUUID())
  }

  async function createSession (id: string): Promise<ChatSession> {
    const now = new Date().toISOString()
    const session: ChatSession = {
      id,
      title: 'New Chat',
      createdAt: now,
      updatedAt: now,
      messages: [],
    }
    sessions.value = { ...sessions.value, [id]: session }
    await $fetch('/api/sessions', { method: 'POST', body: { id } })
    return session
  }

  function updateMessages (id: string, messages: UIMessage[]): void {
    const session = sessions.value[id]
    if (!session) return
    // Deep clone to strip Vue reactivity proxies before serialization
    const plainMessages = JSON.parse(JSON.stringify(messages)) as UIMessage[]
    sessions.value = {
      ...sessions.value,
      [id]: { ...session, messages: plainMessages, updatedAt: new Date().toISOString() },
    }
    $fetch(`/api/sessions/${id}/messages`, {
      method: 'POST',
      body: { messages: plainMessages },
    }).catch(err => console.warn('[chats] failed to sync messages:', err))
  }

  function setTitle (id: string, title: string): void {
    const session = sessions.value[id]
    if (!session || session.title !== chatConfig.untitledLabel) return
    sessions.value = {
      ...sessions.value,
      [id]: { ...session, title },
    }
    $fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: { title },
    }).catch(err => console.warn('[chats] failed to sync title:', err))
  }

  function renameSession (id: string, title: string): void {
    const session = sessions.value[id]
    if (!session) return
    sessions.value = {
      ...sessions.value,
      [id]: { ...session, title },
    }
    $fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: { title },
    }).catch(err => console.warn('[chats] failed to sync rename:', err))
  }

  function deleteSession (id: string): void {
    // eslint-disable-next-line no-unused-vars
    const { [id]: _removed, ...rest } = sessions.value
    sessions.value = rest
    $fetch(`/api/sessions/${id}`, {
      method: 'DELETE',
    }).catch(err => console.warn('[chats] failed to sync delete:', err))
  }

  return {
    // State
    sessions,
    loaded,

    // Getters
    sortedSessions,
    hasSessions,
    latestSession,
    getSession,
    sessionPath,

    // Actions
    fetchSessions,
    fetchSession,
    newSession,
    createSession,
    updateMessages,
    setTitle,
    renameSession,
    deleteSession,
  }
})
