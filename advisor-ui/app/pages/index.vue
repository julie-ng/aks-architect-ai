<script setup lang="ts">
// import { isReasoningUIPart, isTextUIPart } from "ai";
// import { isStreamingPart } from '@nuxt/ui/utils/ai'
import { Chat } from "@ai-sdk/vue";
import { ref } from "vue";

const input = ref("");

const chat = new Chat({
  onError (error) {
    console.error(error);
  },
});

function onSubmit (e: Event) {
  console.log("submitting");
  e.preventDefault();
  if (!input.value.trim()) return;
  chat.sendMessage({
    text: input.value,
  });
  input.value = "";
}
</script>

<template>
  <div class="flex flex-col h-screen max-w-3xl mx-auto">
    <header class="p-4 border-b border-gray-200 dark:border-gray-800">
      <h1 class="text-xl font-semibold">AKS Architect</h1> <UColorModeButton />
      <p class="text-sm text-gray-500">
        AI-assisted architecture advisor for Azure Kubernetes Service
      </p>
    </header>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <p v-if="chat.messages.length === 0" class="text-gray-400 text-center mt-8">
        Ask a question about AKS architecture to get started foo.
      </p>
      <UChatMessages
        :messages="chat.messages"
        :status="chat.status"
        :assistant="{
          variant: 'naked',
        }"
        :user="{
          variant: 'soft',
          ui: { content: 'bg-indigo-50 text-slate-700  dark:bg-indigo-900 dark:text-mist-300' },
        }"
        :auto-scroll="{
          color: 'neutral',
          variant: 'subtle',
        }"
        should-auto-scroll
      >

        <template #content="{ message }">
          <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
            <MDC
              v-if="part.type === 'text'"
              :value="part.text"
              :cache-key="`${message.id}-${index}`"
              class="*:first:mt-0 *:last:mb-0" />
          </template>
        </template>
      </UChatMessages>
    </div>

    <UContainer class="pb-4 sm:pb-6">
      <UChatPrompt
        v-model="input"
        variant="subtle"
        rows="3"
        :error="chat.error"
        @submit="onSubmit"
      >
        <UChatPromptSubmit
          :status="chat.status"
          color="primary"
          variant="solid"
          @stop="chat.stop()"
          @reload="chat.regenerate()"
        />
      </UChatPrompt>
    </UContainer>
  </div>
</template>
