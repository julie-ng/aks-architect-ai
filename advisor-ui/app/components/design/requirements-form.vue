<script setup lang="ts">
import type { SpecQuestion } from '~~/shared/types/spec'

const props = defineProps<{
  requirements: Record<string, string | string[]>
}>()

const emit = defineEmits<{
  'update:requirement': [key: string, value: string | string[] | null]
  'reset:all-requirements': []
}>()

const { data: requirementEntries } = await useAsyncData('designer-requirements', () => {
  return queryCollection('requirements')
    .select('title', 'path', 'spec')
    .all()
})

const hasRequirements = computed(() => Object.keys(props.requirements).length > 0)

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

const hasQuestions = computed(() => questions.value.length > 0)

function getRequirement (questionId: string): string | string[] | null {
  return props.requirements[questionId] ?? null
}

function onChange (questionId: string, value: string | string[] | null) {
  emit('update:requirement', questionId, value)
}
</script>

<template>
  <section v-if="hasQuestions" class="mb-8">
    <h2 class="text-xl font-semibold mb-2">
      Business Requirements
    </h2>
    <p class="text-lg text-muted">
      Answer 5 quick questions to personalize your guidance and results.
    </p>

    <UButton
      v-if="hasRequirements"
      label="Reset All Answers"
      icon="i-lucide-undo-2"
      variant="subtle"
      color="neutral"
      size="xs"
      class="mt-1 cursor-pointer"
      @click="emit('reset:all-requirements')"
    />

    <DesignSpecFormQuestion
      v-for="(question, index) in questions"
      :key="question.id"
      :question="question"
      :index="index"
      :model-value="getRequirement(question.id)"
      @update:model-value="onChange(question.id, $event as string | string[] | null)"
    />
  </section>
</template>
