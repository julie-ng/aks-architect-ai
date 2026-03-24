<script setup lang="ts">
import type { DesignerQuestion } from '~/types/designer'
import type { SavingStatus } from '~/components/ui/saving-indicator.vue'

const route = useRoute()
const designId = route.params.id as string
const designsStore = useDesignsStore()


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

const { data: requirementEntries } = await useAsyncData('designer-requirements', () => {
  return queryCollection('requirements')
    .select('title', 'path', 'designer')
    .all()
})

const requirementQuestions = computed<DesignerQuestion[]>(() => {
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

await callOnce(`design-${designId}`, () => designsStore.fetchDesign(designId))

const design = designsStore.getRecord(designId)!

useHead({
  title: computed(() => `Edit - ${design.title.value}`),
})

const breadcrumbItems = getDesignBreadcrumbs({ title: design.title.value, id: designId }, { action: 'Edit' })

function getDecision (questionId: string): string | string[] | null {
  const key = entryKey(questionId)
  return design.decisions.value[key] ?? null
}

function getRequirement (questionId: string): string | string[] | null {
  const key = entryKey(questionId)
  return design.requirements.value[key] ?? null
}

const autosaveStatus = ref<SavingStatus>(null)
const manualSaveStatus = ref<SavingStatus>(null)
let autosaveTimer: ReturnType<typeof setTimeout> | undefined
let manualSaveTimer: ReturnType<typeof setTimeout> | undefined

function showAutosaved () {
  autosaveStatus.value = 'success'
  clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
 autosaveStatus.value = null
}, 2000)
}

function onManualSave () {
  manualSaveStatus.value = 'success'
  clearTimeout(manualSaveTimer)
  manualSaveTimer = setTimeout(() => {
 manualSaveStatus.value = null
}, 2000)
}

function onDecisionChange (questionId: string, value: string | string[]) {
  design.setDecision(entryKey(questionId), value)
  showAutosaved()
}

function onRequirementChange (questionId: string, value: string | string[]) {
  design.setRequirement(entryKey(questionId), value)
  showAutosaved()
}
</script>

<template>
  <DesignPanel :has-toolbar="true">

    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <template #toolbar-left>
      Left
    </template>

    <template #toolbar-right>
      <UiSavingIndicator :status="autosaveStatus" is-automatic />
      <UiSavingIndicator :status="manualSaveStatus" />
      <UButton
        label="Save"
        color="neutral"
        size="sm"
        class="cursor-pointer"
        @click="onManualSave" />
    </template>

    <template #body>
      <h1 class="text-2xl font-bold">
        Edit Design
      </h1>

      <section v-if="requirementQuestions.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold mt-6 mb-2">
          Requirements
        </h2>

        <DesignComponentFormQuestion
          v-for="(question, index) in requirementQuestions"
          :key="question.id"
          :question="question"
          :index="index"
          :model-value="getRequirement(question.id)"
          @update:model-value="onRequirementChange(question.id, $event as string | string[])"
        />
      </section>

      <section v-if="questions.length > 0">
        <h2 class="text-xl font-semibold mt-6 mb-2">
          Component Decisions
        </h2>

        <DesignComponentFormQuestion
          v-for="(question, index) in questions"
          :key="question.id"
          :question="question"
          :index="index"
          :model-value="getDecision(question.id)"
          @update:model-value="onDecisionChange(question.id, $event as string | string[])"
        />
      </section>

      <p v-if="questions.length === 0 && requirementQuestions.length === 0" class="text-sm text-muted">
        No questions found in the content collections.
      </p>

    </template>
  </DesignPanel>
</template>
