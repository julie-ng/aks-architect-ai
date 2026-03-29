import type { UIMessage } from 'ai'
import { DefaultChatTransport } from 'ai'
import { Chat } from '@ai-sdk/vue'

/**
 * Wraps AI SDK's Chat class with application behavior.
 * Owns: Chat creation, message persistence, title generation.
 * Exposes messages/status as computed fallbacks — store data for SSR, Chat getters on client.
 *
 * @param chatId - The session ID for this chat
 * @returns Chat instance, reactive messages/status, and actions
 */
export function useChatSession (chatId: string) {
  const chatSessionStore = useChatSessionStore()

  // --- State ---

  // shallowRef (not ref) — prevents Vue from deep-proxying the Chat instance,
  // which would break prototype getters like chat.messages, chat.status, chat.error.
  const chat = shallowRef<Chat<UIMessage> | null>(null)

  // Title generation should only fire once per session
  let _hasGeneratedTitle = false

  // --- Getters ---

  const messages = computed(() => {
    // client-side only - read chat.messages getter on VueChatState
    if (chat.value) {
      return chat.value.messages
    }
    else {
      // SSR-loaded data
      return chatSessionStore.messages
    }
  })

  // Chat status: ready until Chat is created, then live from Chat instance
  const status = computed(() => chat.value?.status ?? 'ready')

  // --- Chat initialization (client-only) ---

  // Chat class is client-only: manages streaming connections + reactive DOM state.
  // We load messages from the DB (via callOnce in the page), so Chat can't be created at top level
  // like the Nuxt UI playground examples that start with empty messages.
  if (import.meta.client) {
    // Set the session ID on client — load() ran on SSR, so _id didn't carry over
    chatSessionStore.setId(chatId)

    chat.value = new Chat({
      id: chatId,
      messages: chatSessionStore.messages || [],
      transport: new DefaultChatTransport({
        api: '/api/chat',
        // Send sessionId + designId on every request so the server can inject design context
        // and detect design changes. Transport body is merged into every sendMessage request
        // (unlike Chat constructor body, which is ignored).
        body: {
          sessionId: chatId,
          ...(chatSessionStore.designId
            ? { designId: chatSessionStore.designId }
            : {}
          ),
        },
      }),
      onFinish ({ messages }) {
        chatSessionStore.updateMessages(messages)
      },
      onError (error) {
        console.error('[chat] error:', error)
      },
    })
  }

  // --- Actions ---

  /**
   * Send a user message. Triggers title generation on first message.
   *
   * @param text - The user's message text
   */
  function sendMessage (text: string) {
    chat.value!.sendMessage({ text })

    // Generate a title from the first user message (fire-and-forget, no await).
    // Skip if a design is linked — the session already has a "[Design] ..." title.
    if (!_hasGeneratedTitle && !chatSessionStore.designId) {
      _hasGeneratedTitle = true
      chatSessionStore.generateTitle(text)
    }
  }

  // --- Helpers ---

  /**
   * Check if a message has finished streaming (for gating UI like source links).
   * Returns true for all messages except the last one while streaming.
   *
   * @param message - The message to check
   * @returns Whether the message is complete
   */
  function isMessageFinished (message: UIMessage): boolean {
    const msgs = messages.value
    if (message !== msgs[msgs.length - 1]) return true
    return status.value === 'ready' || status.value === 'error'
  }

  return {
    // AI SDK Chat instance (shallowRef) — for direct access (chat.stop, chat.regenerate, chat.error)
    chat,

    // Computed reactive state — safe for SSR + client
    messages,
    status,
    title: computed(() => chatSessionStore.title),

    // Helpers
    isMessageFinished,

    // Actions
    sendMessage,
  }
}
