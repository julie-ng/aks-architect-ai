<script setup lang="ts">
import { isTextUIPart } from 'ai'
import { extractErrorTitle, extractErrorMessage } from '~~/shared/utils/chat-error'

const route = useRoute()
const chatId = route.params.id as string

// SSR: load session data before hydration (route-level concern)
await callOnce(`chat-session-${chatId}`, () => useChatSessionStore().load(chatId))

// Composable owns all chat behavior — page is pure template
const { chat, messages, status, title, sendMessage, isMessageFinished } = useChatSession(chatId)

const input = ref('')
const purpleIndicatorDots = '*:bg-indigo-500 dark:*:bg-indigo-300'

function onSubmit () {
  if (!input.value.trim()) return
  sendMessage(input.value)
  input.value = ''
}

// Debugging
console.log('[chat-v2] status:', status)
watch(status, (s) => console.log('[chat-v2] status:', s))
</script>

<template>
  <UDashboardPanel
    id="chat-v2"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <!-- TODO: temporary debug header — replace with ChatTitleHeader -->
      <div class="px-4 py-2 text-sm text-muted">
        {{ title }}
      </div>
    </template>
    <template #body>
      <ClientOnly>
        <UContainer class="min-h-dvh flex flex-col py-4 sm:py-6 max-w-3xl">
          <UChatMessages
            :messages="messages"
            :status="status"
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
                  :value="renderCitedText(part, message)"
                  :cache-key="`${message.id}-${index}-${part.text.length}`"
                  class="*:first:mt-0 *:last:mb-0"
                />
              </template>
              <!-- TODO: consider renaming to References -->
              <source-links
                v-if="message.role === 'assistant' && isMessageFinished(message)"
                :sources="getCitedSources(message)"
              />
            </template>
          </UChatMessages>

          <div class="sticky bottom-0 py-4">
            <UAlert
              v-if="chat?.error"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :title="extractErrorTitle(chat.error.message)"
              :description="extractErrorMessage(chat.error.message)"
              class="mb-4"
            />
            <UChatPrompt
              v-model="input"
              :error="chat?.error"
              variant="subtle"
              @submit="onSubmit"
            >
              <UChatPromptSubmit
                :status="status"
                @stop="chat?.stop()"
                @reload="chat?.regenerate()"
              />
            </UChatPrompt>
          </div>
        </UContainer>
      </ClientOnly>
    </template>
  </UDashboardPanel>
</template>
