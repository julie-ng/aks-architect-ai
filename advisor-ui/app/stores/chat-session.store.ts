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

  /**
   * Load a chat session's messages from the API.
   *
   * @param chatId - The session ID to load
   */
  async function load (chatId: string) {
    if (!loggedIn.value) return
    const data = await requestFetch<ChatSession>(`/api/sessions/${chatId}`)
    messages.value = data.messages
  }

  return {
    messages,
    load,
  }
})
