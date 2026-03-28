import type { UIMessage } from 'ai'

/**
 * Important - this is store for SINGLE chat instance
 */
export const useChatStore = defineStore('chat', () => {
  const { loggedIn } = useUserSession()
  const requestFetch = useRequestFetch()
  const messages = ref<UIMessage[]>([])

  async function load (chatId: string) {
    if (!loggedIn.value) return
    const data = await requestFetch<ChatSession>(`/api/sessions/${chatId}`)
    messages.value = data.messages
    // sessions.value = {
    //   ...sessions.value,
    //   [id]: data,
    // }
    // return data
  }

  return {
    messages,
    load,
  }
})
