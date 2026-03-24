<script setup lang="ts">
const route = useRoute()
const designId = route.params.id as string

// console.log(`designId: ${designId}`)

const designsStore = useDesignsStore()

await callOnce(`design-${designId}`, () => designsStore.fetchDesign(designId))

const design = designsStore.getRecord(designId)!
const breadcrumbItems = getDesignBreadcrumbs({
  id: designId,
  title: design.title.value
})

useHead({
  title: design.title,
})
</script>

<template>
  <DesignPanel>

    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <template #body>
      <h1 class="text-2xl font-bold">
        {{ design.title.value }}
      </h1>

      <p v-if="design.description.value" class="text-muted mt-1 mb-4">
        {{ design.description.value }}
      </p>

      <UButton
        label="Edit"
        icon="i-lucide-pencil"
        :to="designsStore.getEditPathById(designId)"
        variant="subtle"
        color="neutral"
      />

      <USeparator class="my-5" />

      <DesignDecisions v-if="Object.keys(design.decisions.value).length > 0" :decisions="design.decisions.value" />

      <DesignRequirements v-if="Object.keys(design.requirements.value).length > 0" :requirements="design.requirements.value" />

      <p v-if="Object.keys(design.decisions.value).length === 0 && Object.keys(design.requirements.value).length === 0" class="text-sm text-muted">
        No decisions or requirements yet. Start by editing this design.
      </p>
    </template>
  </DesignPanel>
</template>
