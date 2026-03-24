<script setup lang="ts">
const designsStore = useDesignsStore()

useHead({
  title: 'Designs',
})

await callOnce('designs', () => designsStore.fetchDesigns())
</script>

<template>
  <DesignPanel>
    <template #body>
      <h1 class="text-2xl font-bold mb-2">
        Architecture Designs
      </h1>
      <p class="mb-6">
        Designs encapsulate the requirements for AKS cluster design and architectural decisions.
      </p>

      <UButton
        label="New Design"
        icon="i-lucide-plus"
        to="/designs/new"
      />

      <div v-if="designsStore.hasDesigns">
        <DesignCard
          v-for="design in designsStore.sortedDesigns"
          :id="design.id"
          :key="design.id"
        />
      </div>
      <p v-else class="text-sm text-muted">
        No designs yet.
      </p>
    </template>
  </DesignPanel>
</template>
