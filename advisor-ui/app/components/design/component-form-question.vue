<script setup lang="ts">
import type { DesignerQuestion } from '~/types/designer'

defineProps<{
  question: DesignerQuestion
  index: number
}>()

const selected = defineModel<string | string[] | null>({ default: null })
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

    <DesignComponentFormInputRadio
      v-if="question.question_type === 'radio'"
      v-model="selected"
      :name="question.id"
      :answers="question.answers || []"
    />

    <DesignComponentFormInputCheckbox
      v-else-if="question.question_type === 'checkbox'"
      v-model="selected"
      :name="question.id"
      :answers="question.answers || []"
    />

    <p v-else class="text-sm text-muted">
      Unsupported question type: {{ question.question_type }}
    </p>
  </section>
</template>
