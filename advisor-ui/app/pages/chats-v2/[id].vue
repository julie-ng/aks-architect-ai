<script setup lang="ts">
import { isTextUIPart } from 'ai'

const route = useRoute()
const chatId = route.params.id as string

const chatsStore = useChatsStore()

// SSR: load session data before hydration (route-level concern)
await callOnce(`chat-session-${chatId}`, () => chatsStore.loadSession(chatId))

// Composable owns all chat behavior — page is pure template
const { chat, sessionTitle, sendMessage, setup } = useChatSession(chatId)

onMounted(() => setup())

const input = ref('')
const purpleIndicatorDots = '*:bg-indigo-500 dark:*:bg-indigo-300'

function onSubmit () {
  if (!input.value.trim()) return
  sendMessage(input.value)
  input.value = ''
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
      <UContainer v-if="chat" class="min-h-dvh flex flex-col py-4 sm:py-6 max-w-3xl">
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
