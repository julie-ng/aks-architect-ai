<script setup lang="ts">
import type { DesignerQuestion } from '~/types/designer'
import type { SavingStatus } from '~/components/ui/saving-indicator.vue'
import type { TabsItem } from '@nuxt/ui'

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

const tabItems = ref<TabsItem[]>([
  {
    label: 'Business Requirements',
    value: 'requirements'
  },
  {
    label: 'Architectural Decisions',
    value: 'decisions'
  }
])

const selectedTab = ref('requirements')
</script>

<template>
  <DesignPanel :has-toolbar="true">

    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <template #toolbar-left>
      <UTabs
        v-model="selectedTab"
        :items="tabItems"
        :content="false"
        color="primary"
        variant="link"
        :ui="{
          label: 'cursor-pointer font-medium',
          indicator: 'border-2 border-primary',
          list: '-bottom-1',
          root: 'pl-4'
        }"
      />
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
      <!-- <h1 class="text-2xl font-bold">
        Edit Design
      </h1> -->

      <section v-if="selectedTab === 'requirements' && requirementQuestions.length > 0" class="mb-8">
        <h2 class="text-xl font-semibold mb-2">
          Business Requirements
        </h2>
        <p class="text-lg text-muted">
          Answer 5 quick questions to personalize your guidance and results.
        </p>
        <DesignComponentFormQuestion
          v-for="(question, index) in requirementQuestions"
          :key="question.id"
          :question="question"
          :index="index"
          :model-value="getRequirement(question.id)"
          @update:model-value="onRequirementChange(question.id, $event as string | string[])"
        />
      </section>

      <section v-if="selectedTab === 'decisions' && questions.length > 0">
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
          @update:model-value="onDecisionChange(question.id, $event as string | string[])"
        />
      </section>

      <p v-if="questions.length === 0 && requirementQuestions.length === 0" class="text-sm text-muted">
        No questions found in the content collections.
      </p>

    </template>
  </DesignPanel>
</template>
