// composables/useChatSession.ts
// import type { Chat } from 'ai'; // duplicate identifier
import { DefaultChatTransport } from 'ai'
import { Chat } from '@ai-sdk/vue'

export const useChatSession2 = (chatId: string) => {
  const chatStore = useChatStore()
  // shallowRef (not ref) — prevents Vue from deep-proxying the Chat instance,
  // which would break prototype getters like chat.messages, chat.status, chat.error.
  const chat = shallowRef<Chat | null>(null)


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
    console.log('[useChatSession2] after Chat created:')
    console.log('  store messages:', chatStore.messages.length)
    console.log('  chat messagesRef:', chat.value?.state.messagesRef.value?.length)
  }

  // 3. Optional: Automatically start on the client
  if (import.meta.client) {
    _startStreaming()
  }


  // Before Chat is created: read from store (SSR-loaded data).
  // After Chat is created: read from chat.messages (getter on VueChatState).
  const messages = computed(() => {
    if (chat.value) {
      return chat.value.messages
    }
    return chatStore.messages
  })

  return {
    chat,
    messages,
    status: computed(() => chat.value?.status ?? 'ready'),
    append: (m: any) => chat.value?.append(m)
  }
}
