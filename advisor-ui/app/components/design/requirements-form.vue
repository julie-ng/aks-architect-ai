<script setup lang="ts">
import type { SpecQuestion } from '~~/shared/types/spec'

const props = defineProps<{
  requirements: Record<string, string | string[]>
}>()

const emit = defineEmits<{
  'update:requirement': [key: string, value: string | string[]]
}>()

const { data: requirementEntries } = await useAsyncData('designer-requirements', () => {
  return queryCollection('requirements')
    .select('title', 'path', 'spec')
    .all()
})

const questions = computed<SpecQuestion[]>(() => {
  return (requirementEntries.value || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((entry: any, index: number) => {
      const spec = entry?.spec || {}

      return {
        id: entry?.path?.split('/')?.pop() || `spec-requirement-${index}`,
        title: spec.title || entry?.title,
        description: spec.description,
        question: spec.question,
        question_type: spec.question_type,
        answers: spec.answers || [],
      } satisfies SpecQuestion
    })
    .filter(q => (q.question_type === 'radio' || q.question_type === 'checkbox') && Array.isArray(q.answers))
})

function getRequirement (questionId: string): string | string[] | null {
  return props.requirements[questionId] ?? null
}

function onChange (questionId: string, value: string | string[]) {
  emit('update:requirement', questionId, value)
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
    <DesignSpecFormQuestion
      v-for="(question, index) in questions"
      :key="question.id"
      :question="question"
      :index="index"
      :model-value="getRequirement(question.id)"
      @update:model-value="onChange(question.id, $event as string | string[])"
    />
  </section>
</template>
