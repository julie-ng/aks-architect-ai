<script setup lang="ts">
const route = useRoute()
const slug = Array.isArray(route.params.slug) ? route.params.slug.join('/') : route.params.slug

const { data } = await useAsyncData(`debug-${slug}`, () => {
  return queryCollection('decisions')
      .all()
    // .where('stem', '=', slug.split('/').pop() ?? slug)
    // .first()
})
</script>

<template>
  <div class="p-8 font-mono text-sm">
    <h1 class="text-xl font-bold mb-4">Debug: {{ slug }}</h1>
    <pre v-if="data">{{ JSON.stringify(data, null, 2) }}</pre>
    <p v-else class="text-red-500">No entry found for "{{ slug }}"</p>
  </div>
</template>
