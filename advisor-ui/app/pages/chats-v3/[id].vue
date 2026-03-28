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

      <ClientOnly>
        got messages? {{ messages }}
        <div v-if="messages">
          Has messages
          <pre><code>{{ messages }}</code></pre>
        </div>
      </ClientOnly>

      <UContainer class="min-h-dvh flex flex-col py-4 sm:py-6 max-w-3xl">
        <ClientOnly>
          <div v-if="chat" >
            Has chat!
            <div v-if="chat.messagses">
              <h2 class="text-green-600">Has <code>chat.state</code>!</h2>
              <pre><code>{{ chat.messages }}</code></pre>
            </div>
            <div v-else>
              <h2 class="text-red-600">No messages - use <code>chat.state</code></h2>
              <pre><code>{{ chat.state }}</code></pre>
            </div>
          </div>
        </ClientOnly>


      </UContainer>
    </template>
  </UDashboardPanel>
</template>
