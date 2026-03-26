import type { UIMessage } from 'ai'
import type { ChatSession } from '~/types/chat'
import { defineStore } from 'pinia'

export const useChatsStore = defineStore('chats', () => {
  const { chat: chatConfig } = useAppConfig()
  const { loggedIn } = useUserSession()
  const requestFetch = useRequestFetch()

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
    if (!loggedIn.value) return
    const data = await requestFetch<Array<{ id: string, title: string, designId: string | null, createdAt: string, updatedAt: string }>>('/api/sessions')
    const record: Record<string, ChatSession> = {}
    // s = session
    for (const s of data) {
      record[s.id] = { ...s, messages: [] }
    }
    sessions.value = record
    loaded.value = true
  }

  async function fetchSession (id: string): Promise<ChatSession> {
    const data = await requestFetch<ChatSession>(`/api/sessions/${id}`)
    sessions.value = {
      ...sessions.value,
      [id]: data,
    }
    return data
  }

  async function newSession (designId?: string): Promise<ChatSession> {
    return createSession(crypto.randomUUID(), designId)
  }

  async function createSession (id: string, designId?: string): Promise<ChatSession> {
    const now = new Date().toISOString()
    const session: ChatSession = {
      id,
      title: 'New Chat',
      designId: designId ?? null,
      createdAt: now,
      updatedAt: now,
      messages: [],
    }
    sessions.value = { ...sessions.value, [id]: session }
    await $fetch('/api/sessions', { method: 'POST', body: { id, ...(designId ? { designId } : {}) } })
    return session
  }

  async function updateMessages (id: string, messages: UIMessage[]): Promise<void> {
    const session = sessions.value[id]
    if (!session) return
    // Deep clone to strip Vue reactivity proxies before serialization
    const plainMessages = JSON.parse(JSON.stringify(messages)) as UIMessage[]
    sessions.value = {
      ...sessions.value,
      [id]: { ...session, messages: plainMessages, updatedAt: new Date().toISOString() },
    }
    await $fetch(`/api/sessions/${id}/messages`, {
      method: 'POST',
      body: { messages: plainMessages },
    })
  }

  async function setTitle (id: string, title: string): Promise<void> {
    const session = sessions.value[id]
    if (!session || session.title !== chatConfig.untitledLabel) return
    sessions.value = {
      ...sessions.value,
      [id]: { ...session, title },
    }
    await $fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: { title },
    })
  }

  async function renameSession (id: string, title: string): Promise<void> {
    const session = sessions.value[id]
    if (!session) return
    sessions.value = {
      ...sessions.value,
      [id]: { ...session, title },
    }
    await $fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: { title },
    })
  }

  function reset () {
    sessions.value = {}
    loaded.value = false
  }

  async function deleteSession (id: string): Promise<void> {
    // eslint-disable-next-line no-unused-vars
    const { [id]: _removed, ...rest } = sessions.value
    sessions.value = rest
    await $fetch(`/api/sessions/${id}`, {
      method: 'DELETE',
    })
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
    reset,
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
