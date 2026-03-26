<script setup lang="ts">
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

const editOpen = ref(false)

const breadcrumbItems = getDesignBreadcrumbs({
  id: designId,
  title: design.value?.title ?? ''
})

useHead({
  title: computed(() => design.value?.title ?? 'Design'),
})
</script>

<template>
  <DesignPanel v-if="design">

    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <template #body>
      <h1 class="text-2xl font-bold">
        {{ design.title }}
      </h1>

      <p v-if="design.description" class="text-muted mt-1 mb-4">
        {{ design.description }}
      </p>

      <div class="flex gap-2">
        <UButton
          label="Edit"
          icon="i-lucide-pencil"
          variant="subtle"
          color="neutral"
          @click="editOpen = true"
        />
      </div>

      <DesignEditModal :id="designId" v-model:open="editOpen" />

      <USeparator class="my-5" />

      <DesignRequirements :design-id="designId" class="mb-4"/>
      <UButton
        label="Configure Requirements"
        icon="i-lucide-settings-2"
        :to="`${design.configurePath}?tab=requirements`"
        variant="subtle"
        color="neutral"
      />

      <!-- <USeparator class="my-6" /> -->

      <DesignDecisions :design-id="designId" class="mt-8 mb-4" />
      <UButton
        label="Configure Decisions"
        icon="i-lucide-settings-2"
        :to="`${design.configurePath}?tab=decisions`"
        variant="subtle"
        color="neutral"
      />
    </template>

    <template #sticky-sidebar>
      <div class="p-4">
        <div v-if="design.hasBeenConfigured">
          <DesignWafScores :design-id="designId" :scores="wafImpact" :baseline="wafBaseline" />
          <p class="my-2">
            <UButton
              label="Adjust Design"
              icon="i-lucide-settings-2"
              :to="design.configurePath"
              variant="subtle"
              color="neutral"
              class="mt-1 w-full justify-center"
            />
          </p>
        </div>
        <p v-else class="text-xs text-muted">
          Make architectural decisions to see scores.
        </p>
      </div>
    </template>
  </DesignPanel>
</template>
