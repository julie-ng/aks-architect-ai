<script setup lang="ts">
const route = useRoute()
const chatId = route.params.id as string

// 1 - Ensure data is loaded server-side before using composable.
await callOnce(async () => {
  await useChatStore().load(chatId)
})

// 2 - Composable owns all chat behavior — page is pure template
const { chat, sessionTitle, sendMessage, messages } = useChatSession2(chatId)



// const input = ref('')
// const purpleIndicatorDots = '*:bg-indigo-500 dark:*:bg-indigo-300'

// function onSubmit () {
//   if (!input.value.trim()) return
//   sendMessage(input.value)
//   input.value = ''
// }
</script>

<template>
  <UDashboardPanel
    id="chat-v3"
    :ui="{ body: 'p-0 sm:p-0' }"
  >
    <template #header>
      <!-- TODO: temporary debug header — replace with ChatTitleHeader -->
      <div class="px-4 py-2 text-sm text-muted">
        Session Title: {{ sessionTitle }}
      </div>
    </template>
    <template #body>
      Hello World

      <div v-if="messages">
        Has messages
        <pre><code>{{ messages }}</code></pre>
      </div>

      <UContainer v-if="chat" class="min-h-dvh flex flex-col py-4 sm:py-6 max-w-3xl">
        Has chat!

        <div v-if="chat.messagses">
          <h2 class="text-green-600">Has <code>chat.state</code>!</h2>
          <pre><code>{{ chat.messages }}</code></pre>
        </div>
        <div v-else>
          <h2 class="text-red-600">No messages - use <code>chat.state</code></h2>
          <pre><code>{{ chat.state }}</code></pre>
        </div>
        <!-- <UChatMessages
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
        </UChatMessages> -->

        <!-- <UChatPrompt
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
        </UChatPrompt> -->
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
