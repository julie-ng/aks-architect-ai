<script setup lang="ts">
const question = defineModel<string>({ required: true })

defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  submit: []
}>()
</script>

<template>
  <form class="flex gap-2 items-start" @submit.prevent="emit('submit')">
    <UTextarea
      v-model="question"
      placeholder="Ask a question... (Enter to submit, Shift+Enter for newline)"
      autoresize
      :rows="1"
      class="flex-1"
      @keydown.enter.exact.prevent="emit('submit')"
    />
    <UButton
      type="submit"
      :loading="loading"
      :disabled="!question.trim()"
      icon="i-lucide-search"
      label="Retrieve"
    />
  </form>
</template>
