<script setup lang="ts">
import { Chat } from '@ai-sdk/vue'
import { ref } from 'vue'

const input = ref('')
const chat = new Chat({})

const isLoading = computed(
  () => chat.status === 'submitted' || chat.status === 'streaming',
)

const handleSubmit = (e: Event) => {
  e.preventDefault()
  if (!input.value.trim()) return
  chat.sendMessage({ text: input.value })
  input.value = ''
}
</script>

<template>
  <div class="flex flex-col h-screen max-w-3xl mx-auto">
    <header class="p-4 border-b border-gray-200 dark:border-gray-800">
      <h1 class="text-xl font-semibold">AKS Architect</h1>
      <p class="text-sm text-gray-500">AI-assisted architecture advisor for Azure Kubernetes Service</p>
    </header>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <p v-if="chat.messages.length === 0" class="text-gray-400 text-center mt-8">
        Ask a question about AKS architecture to get started.
      </p>
      <ChatMessage
        v-for="message in chat.messages"
        :key="message.id"
        :message="message"
      />
    </div>

    <form class="p-4 border-t border-gray-200 dark:border-gray-800" @submit="handleSubmit">
      <div class="flex gap-2">
        <UInput
          v-model="input"
          placeholder="Ask about AKS architecture..."
          class="flex-1"
          :disabled="isLoading"
        />
        <UButton type="submit" :loading="isLoading">
          Send
        </UButton>
      </div>
    </form>
  </div>
</template>
