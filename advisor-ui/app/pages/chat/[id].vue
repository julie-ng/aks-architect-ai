<script setup lang="ts">
import { isTextUIPart } from 'ai'
import { Chat } from '@ai-sdk/vue'
import { ref } from 'vue'

const route = useRoute()
const chatId = route.params.id as string

const { user } = useUserSession()
const chatsStore = useChatsStore()

const ready = ref(false)
let chat: Chat

onMounted(async () => {
  // Load full session (with messages) if not already in store
  let session = chatsStore.getSession(chatId)
  if (!session || session.messages.length === 0) {
    try {
      session = await chatsStore.fetchSession(chatId)
    }
    catch {
      session = await chatsStore.createSession(chatId)
    }
  }

  chat = new Chat({
    id: chatId,
    messages: session.messages,
    body: {
      domains: [
        'cluster-design',
        'networking',
        'security',
        'operations',
        'observability-and-cost',
        'resilience',
      ],
    },
    onFinish ({ messages }) {
      chatsStore.updateMessages(chatId, messages)
    },
    onError (error) {
      console.error(error)
    },
  })

  hasSubmitted.value = session.messages.length > 0
  ready.value = true
})

useHead({
  title: computed(() => {
    const title = chatsStore.getSession(chatId)?.title
    return title && title !== '(untitled chat)' ? title : 'Chat'
  }),
})

const input = ref('')
const hasSubmitted = ref(false)

function onSubmit (e: Event) {
  e.preventDefault()
  if (!input.value.trim()) return

  const message = input.value
  input.value = ''

  if (!hasSubmitted.value) {
    hasSubmitted.value = true
    setTimeout(() => {
      chat.sendMessage({ text: message })
      // Sync user message immediately
      chatsStore.updateMessages(chatId, chat.messages)
    }, 300)
    // Fire title generation in parallel
    generateChatTitle(message)
  }
  else {
    chat.sendMessage({ text: message })
    chatsStore.updateMessages(chatId, chat.messages)
  }
}

async function generateChatTitle (question: string) {
  try {
    const { title } = await $fetch<{ title: string }>('/api/chat/title', {
      method: 'POST',
      body: { question },
    })
    if (title) {
      chatsStore.setTitle(chatId, title)
    }
  }
  catch (err) {
    console.warn('[chat] title generation failed:', err)
  }
}

const messagesWrapperStyle = computed(() => ({
  minHeight: hasSubmitted.value ? '100dvh' : '0px',
}))

function getDisplayText (part: { type: 'text', text: string }, message: (typeof chat)['messages'][number]): string {
  if (message.role !== 'assistant' || !isMessageComplete(message)) {
    return part.text
  }
  const sources = getSourcesMeta(message)
  if (!sources.length) return part.text
  return replaceFootnotesWithCitations(part.text, sources)
}

function isMessageComplete (message: (typeof chat)['messages'][number]) {
  const lastMessage = chat.messages[chat.messages.length - 1]
  if (message !== lastMessage) return true
  return chat.status === 'ready' || chat.status === 'error'
}

const errorTitle = computed(() => {
  if (!ready.value || !chat?.error) return ''
  try {
    const parsed = JSON.parse(chat.error.message)
    if (parsed?.statusCode && parsed?.statusMessage) {
      return `${parsed.statusCode} ${parsed.statusMessage}`
    }
    return 'Error'
  }
  catch {
    return 'Error'
  }
})

const errorMessage = computed(() => {
  if (!ready.value || !chat?.error) return null
  try {
    const parsed = JSON.parse(chat.error.message)
    return parsed?.data?.error ?? parsed?.statusMessage ?? parsed?.message ?? chat.error.message
  }
  catch {
    return chat.error.message || 'An unexpected error occurred.'
  }
})
</script>

<template>
  <UDashboardPanel
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <UDashboardNavbar
        :title="chatsStore.getSession(chatId)?.title ?? 'Chat'"
        :ui="{ title: 'font-normal text-sm text-center text-muted justify-center w-full' }"
      />
    </template>
    <template #body>
      <UContainer v-if="ready">
        <div class="max-w-3xl w-full mx-auto">
          <UContainer
            class="flex-1 flex flex-col gap-4 pt-4 sm:gap-6 min-h-0 transition-[min-height] duration-700 ease-in-out"
            :style="messagesWrapperStyle"
          >

            <p v-if="chat.messages.length === 0" class="text-gray-400 text-center py-4 my-4">
              Ask a question about AKS architecture to get started.
            </p>

            <UChatMessages
              :messages="chat.messages"
              :status="chat.status"
              :spacing-offset="180"
              :ui="{
                root: chat.error ? '[&>article]:last-of-type:min-h-0' : '',
                indicator: '*:bg-indigo-500 dark:*:bg-indigo-300',
                autoScroll: 'bottom-10 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-500 shadow-md border border-slate-300 ring-transparent',
              }"
              :user="{
                variant: 'soft',
                avatar: user ? { src: user.avatarUrl, alt: user.name } : undefined,
                ui: {
                  content: 'bg-slate-100'
                }
              }"
              should-auto-scroll
              auto-scroll
            >
              <template #content="{ message }">
                <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
                  <MDC
                    v-if="isTextUIPart(part)"
                    :value="getDisplayText(part, message)"
                    :cache-key="`${message.id}-${index}-${isMessageComplete(message)}`"
                    class="*:first:mt-0 *:last:mb-0"
                  />
                </template>
                <source-links
                  v-if="message.role === 'assistant' && isMessageComplete(message)"
                  :sources="getCitedSources(message)"
                />
              </template>
            </UChatMessages>

            <div class="sticky bottom-0 bg-default py-6">
              <UAlert
                v-if="chat.error"
                color="error"
                variant="subtle"
                icon="i-lucide-circle-alert"
                :title="errorTitle"
                :description="errorMessage"
                class="mb-4"
              />
              <UChatPrompt
                v-model="input"
                :rows="3"
                @submit="onSubmit"
              >
                <UChatPromptSubmit
                  submitted-color="error"
                  submitted-variant="soft"
                  :status="chat.status"
                  @stop="chat.stop()"
                  @reload="chat.regenerate()" />
              </UChatPrompt>
              <p v-if="!hasSubmitted" class="text-xs text-slate-400 text-center py-3">
                AI can make mistakes. Always verify the information.
              </p>
            </div>
          </UContainer>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
