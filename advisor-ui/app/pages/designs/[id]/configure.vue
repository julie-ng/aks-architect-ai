<script setup lang="ts">
import type { SavingStatus } from '~/components/ui/saving-indicator.vue'
import type { TabsItem } from '@nuxt/ui'

const route = useRoute()
const designId = route.params.id as string
const designsStore = useDesignsStore()

await callOnce(`design-${designId}`, () => designsStore.fetchDesign(designId))

const { design } = useDesign(designId)

const wafImpact = ref<Record<string, number>>({})
const wafBaseline = ref<Record<string, number>>({})

async function calculateWafScores () {
  if (!design.value) return
  const result = await designsStore.fetchWafScores(design.value.decisions, design.value.requirements)
  wafImpact.value = result.impact
  wafBaseline.value = result.baseline
}

await calculateWafScores()

useHead({
  title: computed(() => `Configure - ${design.value?.title ?? 'Design'}`),
})

const breadcrumbItems = getDesignBreadcrumbs({ title: design.value?.title ?? '', id: designId }, { action: 'Configure' })

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

async function onDecisionChange (key: string, value: string | string[]) {
  if (!design.value) return
  await design.value.setDecision(key, value)
  showAutosaved()
  calculateWafScores()
}

async function onRequirementChange (key: string, value: string | string[]) {
  if (!design.value) return
  await design.value.setRequirement(key, value)
  showAutosaved()
  calculateWafScores()
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

const selectedTab = computed({
  get: () => String(route.query.tab ?? 'requirements'),
  set: (tab) => navigateTo({ query: { ...route.query, tab } })
})
</script>

<template>
  <DesignPanel v-if="design" :has-toolbar="true">

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
        label="Save Design"
        icon="i-lucide-save"
        color="secondary"
        variant="subtle"
        size="sm"
        class="cursor-pointer"
        @click="onManualSave" />
    </template>

    <template #body>
      <DesignRequirementsForm
        v-if="selectedTab === 'requirements'"
        :requirements="design.requirements"
        @update:requirement="onRequirementChange"
      />

      <DesignDecisionsForm
        v-if="selectedTab === 'decisions'"
        :decisions="design.decisions"
        @update:decision="onDecisionChange"
      />
    </template>

    <template #sticky-sidebar>
      <div class="p-4">
        <div v-if="Object.keys(wafImpact).length > 0">
          <DesignWafScores :scores="wafImpact" :baseline="wafBaseline" />
          <USeparator class="my-5" />
          <UButton
            label="Discuss with AI"
            color="primary"
            size="lg"
            class="cursor-pointer w-full justify-center"
            icon="i-lucide-bot-message-square"
          />
          <p class="text-xs text-dimmed my-2 text-center">Feature TODO</p>
        </div>
        <p v-else class="text-xs text-muted">
          Make architectural decisions to see scores.
        </p>
      </div>
    </template>
  </DesignPanel>
</template>
