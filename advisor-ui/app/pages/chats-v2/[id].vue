<script setup lang="ts">
import { isTextUIPart, DefaultChatTransport } from 'ai'
import { Chat } from '@ai-sdk/vue'

const route = useRoute()
const chatId = route.params.id as string

const chatsStore = useChatsStore()

await callOnce(`chat-session-${chatId}`, () => chatsStore.loadSession(chatId))

const input = ref('')
// Chat class is client-only (manages streaming connections + reactive DOM state).
// Created in onMounted because it needs session data from the store.
// `isChatReady` gates the template since `chat` is a non-reactive `let`.
const isChatReady = ref(false)
let chat: Chat

onMounted(() => {
  const session = chatsStore.getSession(chatId)!

  chat = new Chat({
    id: chatId,
    messages: session.messages,
    transport: new DefaultChatTransport({ api: '/api/chat-v2' }),
    onError (error) {
      console.error('[chat-v2] error:', error)
    },
  })

  isChatReady.value = true
})

const purpleIndicatorDots = '*:bg-indigo-500 dark:*:bg-indigo-300'
const sessionTitle = computed(() => chatsStore.getSession(chatId)?.title ?? 'New Chat')
let hasGeneratedTitle = false

function onSubmit () {
  if (!input.value.trim()) return
  const message = input.value
  input.value = ''

  chat.sendMessage({ text: message })

  if (!hasGeneratedTitle) {
    hasGeneratedTitle = true
    chatsStore.generateTitle(chatId, message)
  }
}
</script>

<template>
  <UDashboardPanel
    id="chat-v2"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <!-- TODO: temporary debug header — replace with ChatTitleHeader -->
      <div class="px-4 py-2 text-sm text-muted">
        {{ sessionTitle }}
      </div>
    </template>
    <template #body>
      <UContainer v-if="isChatReady" class="min-h-dvh flex flex-col py-4 sm:py-6 max-w-3xl">
        <UChatMessages
          :messages="chat.messages"
          :status="chat.status"
          :ui="{ indicator: purpleIndicatorDots }"
          class="flex-1"
          auto-scroll
        >
          <template #content="{ message }">
            <template
              v-for="(part, index) in message.parts"
              :key="`${message.id}-${part.type}-${index}`"
            >
              <MDC
                v-if="isTextUIPart(part)"
                :value="part.text"
                :cache-key="`${message.id}-${index}`"
                class="*:first:mt-0 *:last:mb-0"
              />
            </template>
          </template>
        </UChatMessages>

        <UChatPrompt
          v-model="input"
          :error="chat.error"
          variant="subtle"
          class="sticky bottom-0"
          @submit="onSubmit"
        >
          <UChatPromptSubmit
            :status="chat.status"
            @stop="chat.stop()"
            @reload="chat.regenerate()"
          />
        </UChatPrompt>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
