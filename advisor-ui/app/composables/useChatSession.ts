import { DefaultChatTransport } from 'ai'
import { Chat } from '@ai-sdk/vue'

/**
 * Wraps AI SDK's Chat class with application behavior.
 * Owns: Chat creation, message persistence, title generation.
 * Exposes the raw Chat instance for template bindings (chat.messages, chat.status, etc).
 *
 * @param chatId - The session ID for this chat
 * @returns Chat instance ref, state refs, and actions
 */
export function useChatSession (chatId: string) {
  console.log('[useChatSession] init, chatId:', chatId)
  const chatsStore = useChatsStore()

  // --- State ---

  // AI SDK Chat instance as a ref — null until setup() runs (client-only).
  // Chat manages its own internal reactivity (messages, status, error are reactive).
  // The ref gives Vue the signal that the instance was assigned in setup().
  const chat = ref<Chat | null>(null)

  // Title generation should only fire once per session
  let _hasGeneratedTitle = false

  // --- Getters ---

  // Reactive title from the store — updates when generateTitle() completes
  const sessionTitle = computed(() => chatsStore.getSession(chatId)?.title ?? 'New Chat')

  // --- Actions ---

  /**
   * Initialize the AI SDK Chat instance. Must be called from onMounted()
   * because Chat is client-only (manages streaming connections).
   */
  function setup () {
    const session = chatsStore.getSession(chatId)!
    console.log('[useChatSession] setup(), session:', session?.id, 'messages:', session?.messages.length)

    chat.value = new Chat({
      id: chatId,
      messages: session.messages,
      transport: new DefaultChatTransport({ api: '/api/chat-v2' }),
      // Persist messages to DB after each completed response
      onFinish ({ messages }) {
        chatsStore.updateMessages(chatId, messages)
      },
      onError (error) {
        console.error('[chat] error:', error)
      },
    })

    console.log('[useChatSession] ready, chat:', !!chat.value)
  }

  /**
   * Send a user message. Handles title generation on first message.
   *
   * @param text - The user's message text
   */
  function sendMessage (text: string) {
    chat.value!.sendMessage({ text })

    // Generate a title from the first user message (fire-and-forget)
    if (!_hasGeneratedTitle) {
      _hasGeneratedTitle = true
      chatsStore.generateTitle(chatId, text)
    }
  }

  return {
    // AI SDK Chat instance — template binds to chat.messages, chat.status, chat.error
    chat,

    // State
    sessionTitle,

    // Actions
    setup,
    sendMessage,
  }
}
