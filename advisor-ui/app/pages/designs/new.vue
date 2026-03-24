<script setup lang="ts">
const { design } = useNewDesign()

useHead({
  title: 'New Design',
})

const breadcrumbItems = getDesignBreadcrumbs(null, { action: 'New' })

async function onCreate () {
  await design.save()
  if (design.configurePath) {
    navigateTo(design.configurePath, { replace: true })
  }
}
</script>

<template>
  <DesignPanel>

    <template #navbar-title>
      <UBreadcrumb :items="breadcrumbItems" />
    </template>

    <template #body>
      <h1 class="text-xl font-bold mb-2">
        New Architecture Design
      </h1>
      <p class="mb-6 max-w-lg">
        An architecture design encapsulates the requirements for your design as well as the architecture decisions to be made.
      </p>

      <DesignMetadataForm
        v-model:title="design.title"
        v-model:description="design.description"
        submit-label="Next"
        :loading="design.saving"
        @submit="onCreate"
      />
    </template>
  </DesignPanel>
</template>
