<script setup lang="ts">
import { isTextUIPart, isToolUIPart } from 'ai'
import { isToolStreaming } from '@nuxt/ui/utils/ai'
import { extractErrorTitle, extractErrorMessage } from '~~/shared/utils/chat-error'

const route = useRoute()
const { user } = useUserSession()
const chatId = route.params.id as string

// Load session data — runs on SSR and on every client remount (page-key forces remount on nav).
// Do NOT use callOnce here — its permanent cache prevents reload when navigating between sessions.
await useChatSessionStore().load(chatId)


// Composable owns all chat behavior — page is pure template
const { chat, messages, status, sendMessage, title, isMessageFinished } = useChatSession(chatId)

useHead({
  title
})


const input = ref('')
const isBlankChat = computed(() => messages.value.length === 0)

const purpleIndicatorDots = '*:bg-indigo-500 dark:*:bg-indigo-300'

// Prompt - vertically centered if no messages, sticky at bottom otherwise
const messagesWrapperStyle = computed(() => ({
  minHeight: isBlankChat.value ? '0px' : '100dvh',
}))

function onSubmit () {
  if (!input.value.trim()) return
  sendMessage(input.value)
  input.value = ''
}

// Debugging
// console.log('[chat-v2] status:', status)
// watch(status, (s) => console.log('[chat-v2] status:', s))
</script>

<template>
  <UDashboardPanel
    id="chat-v2"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <template #header>
      <ChatTitleHeader :chat-id="chatId" />
    </template>
    <template #body>
      <ClientOnly>
        <div class="max-w-200 w-full mx-auto">
          <UContainer
            class="flex-1 flex flex-col gap-4 pt-4 sm:gap-6 min-h-0 transition-[min-height] duration-700 ease-in-out"
            :style="messagesWrapperStyle">

            <p v-if="isBlankChat" class="text-gray-400 text-center py-4 my-4">
              Ask a question about AKS architecture to get started.
            </p>

            <UChatMessages
              :messages="messages"
              :status="status"
              :spacing-offset="180"
              :ui="{
                root: chat.error ? '[&>article]:last-of-type:min-h-0' : '',
                indicator: purpleIndicatorDots,
                autoScroll: 'bottom-10 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-500 shadow-md border border-slate-300 ring-transparent',
              }"
              :user="{
                variant: 'soft',
                avatar: user ? { src: user.avatarUrl, alt: user.name } : undefined,
                ui: {
                  content: 'bg-slate-100'
                }
              }"
              :assistant="{
                side: 'left',
                variant: 'inline',
                avatar: {
                  icon: 'i-lucide-bot-message-square',
                  color: 'primary',
                },
              }"
              auto-scroll
            >
              <template #leading="{ avatar, message }">
                <ChatAssistantAvatar
                  v-if="message.role === 'assistant'"
                  class="-mt-1 mr-4"
                  :icon="avatar.icon"
                  :pulsing="status === 'submitted'"
                  :pinging="status === 'streaming' && !isMessageFinished(message)"
                />
                <div v-if="message.role === 'user'">
                  <UAvatar :src="avatar.src" :alt="avatar.alt" />
                </div>
              </template>
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

                  <!-- Design snapshot tool -->
                  <UChatTool
                    v-else-if="isToolUIPart(part)"
                    :loading="isToolStreaming(part)"
                    :text="isToolStreaming(part) ? 'Loading design snapshot...' : 'Loaded design snapshot'"
                    :streaming="isToolStreaming(part)"
                    icon="i-lucide-map"
                  >
                    <!-- class="border border-slate-200 text-primary rounded-sm px-2 py-1" -->
                    <design-snapshot-card
                      v-if="!isToolStreaming(part) && part.output?.found"
                      :design-id="part.output.designId"
                      :title="part.output.title"
                      :requirements="part.output.requirements"
                      :decisions="part.output.decisions"
                    />
                    <div
                      v-else-if="!isToolStreaming(part) && part.output && !part.output.found"
                      class="text-sm text-muted py-2"
                    >
                      Design no longer available.
                    </div>
                    <UAlert
                      v-else-if="!isToolStreaming(part) && part.errorText"
                      color="error"
                      variant="subtle"
                      icon="i-lucide-circle-alert"
                      title="Could not load design snapshot"
                      :description="part.errorText"
                    />
                  </UChatTool>
                </template>
                <!-- TODO: consider renaming to References -->
                <source-links
                  v-if="message.role === 'assistant' && isMessageFinished(message)"
                  :sources="getCitedSources(message)"
                />
              </template>
            </UChatMessages>

            <div class="sticky bottom-0 bg-default py-6">
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
                :rows="3"
                variant="subtle"
                @submit="onSubmit"
              >
                <UChatPromptSubmit
                  submitted-color="error"
                  submitted-variant="soft"
                  :status="status"
                  @stop="chat?.stop()"
                  @reload="chat?.regenerate()"
                />
              </UChatPrompt>
              <p v-if="isBlankChat" class="text-xs text-slate-400 text-center py-3">
                AI can make mistakes. Always verify the information.
              </p>
            </div>
          </UContainer>
        </div>
      </ClientOnly>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
/* Override Tailwind my-12 on MDC-rendered hr */
:deep(hr) {
  margin-top: 2.5rem !important;
  margin-bottom: 2.5rem !important;
}
</style>
