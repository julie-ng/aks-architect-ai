<script setup lang="ts">
type DesignerAnswer = {
  key: string
  label?: string
  title?: string
  description?: string
  highlights?: string[]
  highglights?: string[]
  disabled?: boolean
}

type DesignerQuestion = {
  id: string
  title?: string
  description?: string
  question?: string
  question_type?: string
  answers?: DesignerAnswer[]
}

defineProps<{
  question: DesignerQuestion
  index: number
}>()
</script>

<template>
  <section class="py-4 sm:py-5 space-y-3">
    <header class="space-y-1">
      <h2 class="sm:text-lg font-semibold">
        {{ question.question || `Question ${index + 1}` }}
      </h2>

      <p v-if="question.description" class="text-sm text-muted">
        {{ question.description }}
      </p>
    </header>
    <!--
    <p v-if="question.question" class="">
      {{ question.question }}
    </p> -->

    <designer-input-radio
      v-if="question.question_type === 'radio'"
      :name="question.id"
      :answers="question.answers || []"
    />

    <p v-else class="text-sm text-muted">
      Unsupported question type: {{ question.question_type }}
    </p>
  </section>
</template>
