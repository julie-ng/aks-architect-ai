<script setup lang="ts">
import type { DesignerQuestion } from '~/types/designer'

const props = defineProps<{
  decisions: Record<string, string | string[]>
}>()

const emit = defineEmits<{
  'update:decision': [key: string, value: string | string[]]
}>()

const { data: componentEntries } = await useAsyncData('designer-components', () => {
  return queryCollection('components')
    .select('title', 'path', 'designer')
    .all()
})

const questions = computed<DesignerQuestion[]>(() => {
  return (componentEntries.value || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((entry: any, index: number) => {
      const designer = entry?.designer || {}

      return {
        id: entry?.path || `designer-question-${index}`,
        title: designer.title || entry?.title,
        description: designer.description,
        question: designer.question,
        question_type: designer.question_type,
        answers: designer.answers || [],
      } satisfies DesignerQuestion
    })
    .filter(q => (q.question_type === 'radio' || q.question_type === 'checkbox') && Array.isArray(q.answers))
})

function entryKey (questionId: string): string {
  return questionId.split('/').pop() || questionId
}

function getDecision (questionId: string): string | string[] | null {
  const key = entryKey(questionId)
  return props.decisions[key] ?? null
}

function onChange (questionId: string, value: string | string[]) {
  emit('update:decision', entryKey(questionId), value)
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
    <DesignComponentFormQuestion
      v-for="(question, index) in questions"
      :key="question.id"
      :question="question"
      :index="index"
      :model-value="getDecision(question.id)"
      @update:model-value="onChange(question.id, $event as string | string[])"
    />
  </section>
</template>
