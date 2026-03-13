<script setup lang="ts">
import { isTextUIPart } from 'ai'
import { Chat } from "@ai-sdk/vue";
import { ref } from "vue";

// definePageMeta({ layout: 'dashboard' })

useHead({
  title: 'Chat'
})

const input = ref("");

const chat = new Chat({
  onError (error) {
    console.error(error);
  },
});

const hasSubmitted = ref(false);

function onSubmit (e: Event) {
  console.log("submitting");
  e.preventDefault();
  if (!input.value.trim()) return;

  const message = input.value;
  input.value = "";

  if (!hasSubmitted.value) {
    hasSubmitted.value = true;
    // Delay sending until the container transition finishes
    setTimeout(() => {
      chat.sendMessage({ text: message });
    }, 300);
  }
 else {
    chat.sendMessage({ text: message });
  }
}

const messagesWrapperStyle = computed(() => ({
  minHeight: hasSubmitted.value ? '100dvh' : '0px'
}))
</script>
<template>
  <UDashboardPanel
    id="chat"
    class="relative min-h-0"
    :ui="{ body: 'p-0 sm:p-0 overscroll-none' }"
  >
    <!-- <template #header>
      <UDashboardNavbar title="Chat" />
    </template> -->

    <template #body>
      <UContainer>
        <div class="max-w-2xl w-full mx-auto">
          <UContainer class="flex-1 flex flex-col gap-4 pt-4 sm:gap-6 min-h-0 transition-[min-height] duration-700 ease-in-out" :style="messagesWrapperStyle">
            <p v-if="chat.messages.length === 0" class="text-gray-400 text-center py-4 my-4">
              Ask a question about AKS architecture to get started.
            </p>

            <UChatMessages
              :messages="chat.messages"
              :status="chat.status"
              :spacing-offset="180"
              :ui="{ autoScroll: 'bottom-10 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-500 shadow-md border border-slate-300 ring-transparent' }"
              should-auto-scroll
              auto-scroll
            >
              <!-- class="lg:pt-(--ui-header-height) pb-6 sm:pb-6" -->
              <template #content="{ message }">
                <template v-for="(part, index) in message.parts" :key="`${message.id}-${part.type}-${index}`">
                  <MDC
                    v-if="isTextUIPart(part)"
                    :value="part.text"
                    :cache-key="`${message.id}-${index}`"
                    class="*:first:mt-0 *:last:mb-0"
                  />
                </template>
              </template>
            </UChatMessages>

            <!-- Force solid bg with bg-default -->
            <div class="sticky bottom-0 bg-default py-6">
              <UChatPrompt
                v-model="input"
                :rows="3"
                :error="chat.error"
                @submit="onSubmit"
              >
                <UChatPromptSubmit :status="chat.status" @stop="chat.stop()" @reload="chat.regenerate()" />
              </UChatPrompt>
              <p v-if="!hasSubmitted" class="text-xs text-slate-400 text-center py-3">AI can make mistakes. Always verify the information.</p>
            </div>
          </UContainer>
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
