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

  const getSessionByDesignId = computed(() =>
    (designId: string): ChatSession | undefined =>
      Object.values(sessions.value).find(s => s.designId === designId),
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

  async function loadSession (id: string): Promise<ChatSession> {
    const existing = sessions.value[id]
    if (existing && existing.messages.length > 0) {
      return existing
    }
    try {
      return await fetchSession(id)
    }
    catch {
      return await createSession(id)
    }
  }

  async function fetchSession (id: string): Promise<ChatSession> {
    const data = await requestFetch<ChatSession>(`/api/sessions/${id}`)
    sessions.value = {
      ...sessions.value,
      [id]: data,
    }
    return data
  }

  async function newSession (opts?: { designId?: string, title?: string }): Promise<ChatSession> {
    return createSession(crypto.randomUUID(), opts)
  }

  async function createSession (id: string, opts?: { designId?: string, title?: string }): Promise<ChatSession> {
    const designId = opts?.designId
    const title = opts?.title ?? 'New Chat'
    const now = new Date().toISOString()
    const session: ChatSession = {
      id,
      title,
      designId: designId ?? null,
      createdAt: now,
      updatedAt: now,
      messages: [],
    }
    sessions.value = { ...sessions.value, [id]: session }
    await $fetch('/api/sessions', {
      method: 'POST',
      body: {
        id,
        ...(title !== 'New Chat' ? { title } : {}),
        ...(designId ? { designId } : {}),
      },
    })
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

  async function generateTitle (id: string, question: string): Promise<void> {
    try {
      const { title } = await $fetch<{ title: string }>('/api/chat/title', {
        method: 'POST',
        body: { question },
      })
      if (title) {
        await setTitle(id, title)
      }
    }
    catch (err) {
      console.warn('[chats] title generation failed:', err)
    }
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
    getSessionByDesignId,
    sessionPath,

    // Actions
    reset,
    fetchSessions,
    loadSession,
    fetchSession,
    newSession,
    createSession,
    updateMessages,
    setTitle,
    generateTitle,
    renameSession,
    deleteSession,
  }
})
