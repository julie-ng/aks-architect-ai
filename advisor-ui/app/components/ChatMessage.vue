<script setup lang="ts">
import type { UIMessage } from '@ai-sdk/vue'

const props = defineProps<{
  message: UIMessage
}>()

const isUser = computed(() => props.message.role === 'user')
</script>

<template>
  <div :class="['flex', isUser ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[80%] rounded-lg px-4 py-3',
        isUser
          ? 'bg-primary-500 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
      ]"
    >
      <div class="whitespace-pre-wrap">{{ message.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '' }}</div>
    </div>
  </div>
</template>
