import type { UIMessage } from 'ai'
import type { ChatSession } from '~/types/chat'

/**
 * Store for a single active chat session's message data.
 * Separate from chatsStore (plural) which handles session listing/navigation.
 */
export const useChatSessionStore = defineStore('chat-session', () => {
  const { loggedIn } = useUserSession()
  const requestFetch = useRequestFetch()

  // Session ID — set by load() on SSR, or setId() on client
  let _id: string | null = null

  const messages = ref<UIMessage[]>([])
  const title = ref('New Chat')
  const designId = ref<string | null>(null)

  /**
   * Load a chat session's messages and title from the API.
   * Stores the session ID internally for subsequent actions.
   *
   * @param chatId - The session ID to load
   */
  async function load (chatId: string) {
    if (!loggedIn.value) return
    _id = chatId
    const data = await requestFetch<ChatSession>(`/api/sessions/${_id}`)
    messages.value = data.messages
    title.value = data.title
    designId.value = data.designId ?? null
  }

  /**
   * Generate a title from the first user message, then persist it.
   * Fire-and-forget — does not block the UI.
   *
   * @param question - The user's first message text
   */
  async function generateTitle (question: string) {
    try {
      const { title: generated } = await $fetch<{ title: string }>('/api/chat/title', {
        method: 'POST',
        body: { question },
      })
      if (generated) {
        title.value = generated
        await $fetch(`/api/sessions/${_id}`, {
          method: 'PATCH',
          body: { title: generated },
        })
      }
    }
    catch (err) {
      console.warn('[chat-session] title generation failed:', err)
    }
  }

  /**
   * Persist messages to the DB after a streaming response completes.
   * Deep clones to strip Vue reactivity proxies before serialization.
   *
   * @param msgs - The full messages array from AI SDK Chat
   */
  async function updateMessages (msgs: UIMessage[]) {
    const plainMessages = JSON.parse(JSON.stringify(msgs)) as UIMessage[]
    messages.value = plainMessages
    await $fetch(`/api/sessions/${_id}/messages`, {
      method: 'POST',
      body: { messages: plainMessages },
    })
  }

  /**
   * Set the session ID on the client side (for when load() ran on SSR only).
   *
   * @param chatId - The session ID
   */
  function setId (chatId: string) {
    _id = chatId
  }

  return {
    messages,
    title,
    designId,
    load,
    setId,
    generateTitle,
    updateMessages,
  }
})
