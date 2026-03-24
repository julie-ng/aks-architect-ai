<script setup lang="ts">
const route = useRoute()
const designId = route.params.id as string
const designsStore = useDesignsStore()

await callOnce(`design-${designId}`, () => designsStore.fetchDesign(designId))

const { design } = useDesign(designId)

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
        <UButton
          label="Configure"
          icon="i-lucide-settings-2"
          :to="design.configurePath"
          variant="subtle"
          color="neutral"
        />
      </div>

      <DesignEditModal :id="designId" v-model:open="editOpen" />

      <USeparator class="my-5" />

      <DesignDecisions v-if="Object.keys(design.decisions).length > 0" :decisions="design.decisions" />

      <DesignRequirements v-if="Object.keys(design.requirements).length > 0" :requirements="design.requirements" />

      <p v-if="Object.keys(design.decisions).length === 0 && Object.keys(design.requirements).length === 0" class="text-sm text-muted">
        No decisions or requirements yet. Start by editing this design.
      </p>
    </template>
  </DesignPanel>
</template>
