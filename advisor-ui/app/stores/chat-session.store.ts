import type { UIMessage } from 'ai'
import type { ChatSession } from '~/types/chat'

/**
 * Store for a single active chat session's message data.
 * Separate from chatsStore (plural) which handles session listing/navigation.
 */
export const useChatSessionStore = defineStore('chat-session', () => {
  const { loggedIn } = useUserSession()
  const requestFetch = useRequestFetch()

  const messages = ref<UIMessage[]>([])
  const title = ref('New Chat')

  /**
   * Load a chat session's messages and title from the API.
   *
   * @param chatId - The session ID to load
   */
  async function load (chatId: string) {
    if (!loggedIn.value) return
    const data = await requestFetch<ChatSession>(`/api/sessions/${chatId}`)
    messages.value = data.messages
    title.value = data.title
  }

  /**
   * Generate a title from the first user message, then persist it.
   * Fire-and-forget — does not block the UI.
   *
   * @param chatId - The session ID to update
   * @param question - The user's first message text
   */
  async function generateTitle (chatId: string, question: string) {
    try {
      const { title: generated } = await $fetch<{ title: string }>('/api/chat/title', {
        method: 'POST',
        body: { question },
      })
      if (generated) {
        title.value = generated
        await $fetch(`/api/sessions/${chatId}`, {
          method: 'PATCH',
          body: { title: generated },
        })
      }
    }
    catch (err) {
      console.warn('[chat-session] title generation failed:', err)
    }
  }

  return {
    messages,
    title,
    load,
    generateTitle,
  }
})
