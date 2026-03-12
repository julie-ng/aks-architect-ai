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

const isLoading = computed(
  () => chat.status === "submitted" || chat.status === "streaming",
);

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
      <h1 class="text-xl font-semibold">AKS Architect</h1>
      <p class="text-sm text-gray-500">
        AI-assisted architecture advisor for Azure Kubernetes Service
      </p>
    </header>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <p v-if="chat.messages.length === 0" class="text-gray-400 text-center mt-8">
        Ask a question about AKS architecture to get started foo.
      </p>
      <!-- <ChatMessage
        v-for="message in chat.messages"
        :key="message.id"
        :message="message"
      /> -->
      <UChatMessages
        :messages="chat.messages"
        :status="chat.status"
        :assistant="{
          variant: 'outline',
        }"
        :user="{
          variant: 'solid',
          ui: { content: 'bg-blue-800' },
        }"
        :auto-scroll="{
          color: 'neutral',
          variant: 'outline',
        }"
        should-auto-scroll>
        <!-- <UChatMessage
           v-for="(message, index) in chat.messages"
           :key="message.id"
           v-bind="message"
         /> -->

        <template #content="{ message }">
          <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
            <MDC
              :ui="{ prose: { p: { base: 'leading-1' } } }"
              :value="part.text"
              :cache-key="`${message.id}-${index}`"
              class="*:first:mt-0 *:last:mb-0" />
          </template>
        </template>
      </UChatMessages>
    </div>

    <form class="p-4 border-t border-gray-200 dark:border-gray-800" @submit="onSubmit">
      <div class="flex gap-2">
        <UInput
          v-model="input"
          placeholder="Ask about AKS architecture..."
          class="flex-1"
          :disabled="isLoading" />
        <UButton type="submit" :loading="isLoading"> Send </UButton>
      </div>
    </form>
  </div>
</template>
