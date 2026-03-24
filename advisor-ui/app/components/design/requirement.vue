<script setup lang="ts">
defineProps<{
  questionTitle: string
  answerLabel: string
}>()
</script>

<template>
  <article class="border border-slate-200 rounded-md px-6 py-3 my-4">
    <p class="my-2 font-medium">{{ questionTitle }}</p>
    <p class="my-2 text-muted">{{ answerLabel }}</p>
  </article>
</template>
