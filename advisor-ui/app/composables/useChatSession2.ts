// composables/useChatSession.ts
// import type { Chat } from 'ai'; // duplicate identifier
import { DefaultChatTransport } from 'ai'
import { Chat } from '@ai-sdk/vue'

export const useChatSession2 = (chatId: string) => {
  const chatStore = useChatStore()
  const chat = ref<Chat | null>(null)

  // 1. Compute messages directly from the Store OR the live Chat instance
  // This ensures that if the Chat hasn't started yet, you still see the history
  const messages = computed(async () => {
    if (chat.value) {
      console.log('[useChatSession2] - got chat.value')
      return chat.value.state.messagesRef
    }
    else {
      console.log('[useChatSession2] - NO chat.value, got messages?', chatStore.messages)
      return chatStore.messages || []
    }
  })

  // 2. Logic to "activate" the AI SDK
  const _startStreaming = async () => {
    console.log('_startStreaming()')
    if (import.meta.server || chat.value) return
    // await chatStore.load(chatId)
    //
    console.log('[useChatSession2] creating new Chat()…')
    chat.value = new Chat({
      id: chatId,
      messages: chatStore.messages || [],
      transport: new DefaultChatTransport({ api: '/api/chat-v2' }),
      onFinish ({ messages }) {
        // chatStore.updateMessages(chatId, messages) // <-- TODO
        console.log('onFinish')
        console.log(messages)
      },
      onError (error) {
        console.error('[chat] error:', error)
      },
    })
  }

  // 3. Optional: Automatically start on the client
  if (import.meta.client) {
    _startStreaming()
  }

  return {
    chat,
    messages,
    status: computed(() => chat.value?.state.statusRef ?? 'ready'),
    append: (m: any) => chat.value?.append(m)
  }
}
