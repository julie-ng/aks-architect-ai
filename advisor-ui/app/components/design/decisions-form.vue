<script setup lang="ts">
import type { SpecQuestion } from '~~/shared/types/spec'

const props = defineProps<{
  decisions: Record<string, string | string[]>
}>()

const emit = defineEmits<{
  'update:decision': [key: string, value: string | string[]]
}>()

const { data: decisionEntries } = await useAsyncData('designer-decisions', () => {
  return queryCollection('decisions')
    .select('title', 'path', 'spec')
    .all()
})

const questions = computed<SpecQuestion[]>(() => {
  return (decisionEntries.value || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((entry: any, index: number) => {
      const spec = entry?.spec || {}

      return {
        id: entry?.path?.split('/')?.pop() || `spec-question-${index}`,
        title: spec.title || entry?.title,
        description: spec.description,
        question: spec.question,
        question_type: spec.question_type,
        answers: spec.answers || [],
      } satisfies SpecQuestion
    })
    .filter(q => (q.question_type === 'radio' || q.question_type === 'checkbox') && Array.isArray(q.answers))
})

function getDecision (questionId: string): string | string[] | null {
  return props.decisions[questionId] ?? null
}

function onChange (questionId: string, value: string | string[]) {
  emit('update:decision', questionId, value)
}
</script>

<template>
  <section v-if="questions.length > 0">
    <h2 class="text-xl font-semibold mb-2">
      Architectural Decisions
    </h2>
    <p class="text-lg text-muted">
      Answer 8 quick questions to prioritze most relevant official documentation and best practices.
    </p>
    <DesignSpecFormQuestion
      v-for="(question, index) in questions"
      :key="question.id"
      :question="question"
      :index="index"
      :model-value="getDecision(question.id)"
      @update:model-value="onChange(question.id, $event as string | string[])"
    />
  </section>
</template>
