<script setup lang="ts">
import type { DesignerQuestion } from '~/types/designer'

const props = defineProps<{
  requirements: Record<string, string | string[]>
}>()

const emit = defineEmits<{
  'update:requirement': [key: string, value: string | string[]]
}>()

const { data: requirementEntries } = await useAsyncData('designer-requirements', () => {
  return queryCollection('requirements')
    .select('title', 'path', 'designer')
    .all()
})

const questions = computed<DesignerQuestion[]>(() => {
  return (requirementEntries.value || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((entry: any, index: number) => {
      const designer = entry?.designer || {}

      return {
        id: entry?.path || `designer-requirement-${index}`,
        title: designer.title || entry?.title,
        description: designer.description,
        question: designer.title,
        question_type: designer.question_type,
        answers: designer.answers || [],
      } satisfies DesignerQuestion
    })
    .filter(q => (q.question_type === 'radio' || q.question_type === 'checkbox') && Array.isArray(q.answers))
})

function entryKey (questionId: string): string {
  return questionId.split('/').pop() || questionId
}

function getRequirement (questionId: string): string | string[] | null {
  const key = entryKey(questionId)
  return props.requirements[key] ?? null
}

function onChange (questionId: string, value: string | string[]) {
  emit('update:requirement', entryKey(questionId), value)
}
</script>

<template>
  <section v-if="questions.length > 0" class="mb-8">
    <h2 class="text-xl font-semibold mb-2">
      Business Requirements
    </h2>
    <p class="text-lg text-muted">
      Answer 5 quick questions to personalize your guidance and results.
    </p>
    <DesignComponentFormQuestion
      v-for="(question, index) in questions"
      :key="question.id"
      :question="question"
      :index="index"
      :model-value="getRequirement(question.id)"
      @update:model-value="onChange(question.id, $event as string | string[])"
    />
  </section>
</template>
