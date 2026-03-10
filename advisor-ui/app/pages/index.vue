<script setup lang="ts">
import { useChat } from '@ai-sdk/vue'

// const { messages, input, handleSubmit, status } = useChat()

// const isLoading = computed(() => status.value === 'submitted' || status.value === 'streaming')
//

const isLoading = false
</script>

<template>
  <div class="flex flex-col h-screen max-w-3xl mx-auto">
    <header class="p-4 border-b border-gray-200 dark:border-gray-800">
      <h1 class="text-xl font-semibold">AKS Architect</h1>
      <p class="text-sm text-gray-500">AI-assisted architecture advisor for Azure Kubernetes Service</p>
    </header>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- <p v-if="messages.length === 0" class="text-gray-400 text-center mt-8">
        Ask a question about AKS architecture to get started.
      </p> -->
      <!-- <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
      /> -->
    </div>

    <form class="p-4 border-t border-gray-200 dark:border-gray-800" @submit.prevent="handleSubmit">
      <div class="flex gap-2">
          <!-- v-model="input" -->
        <UInput
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
