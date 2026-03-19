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

const { data: componentEntries } = await useAsyncData('designer-components', () => {
  return queryCollection('components')
    .select('title', 'path', 'designer')
    .all()
})

const questions = computed<DesignerQuestion[]>(() => {
  return (componentEntries.value || [])
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
    .filter(q => q.question_type === 'radio' && Array.isArray(q.answers))
})
</script>

<template>
  <UContainer class="py-6 overflow-y-auto">
    <div class="max-w-3xl mx-auto space-y-4">
      <h1 class="text-2xl font-bold">
        Design Wizard
      </h1>

      <designer-question
        v-for="(question, index) in questions"
        :key="question.id"
        :question="question"
        :index="index"
      />

      <p v-if="questions.length === 0" class="text-sm text-muted">
        No radio questions found in the components content collection.
      </p>
    </div>
  </UContainer>
</template>
