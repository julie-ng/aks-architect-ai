<script setup lang="ts">
// UDashboardGroup sets overflow:hidden on <html>, breaking native anchor navigation.
// Manually scroll to the target element when the hash changes.
function scrollToHash () {
  const hash = useRoute().hash
  if (!hash) return

  nextTick(() => {
    const el = document.querySelector(hash)
    el?.scrollIntoView({ behavior: 'smooth' })
  })
}

onMounted(scrollToHash)
watch(() => useRoute().hash, scrollToHash)
</script>

<template>
  <NuxtLayout name="default">
    <div class="w-full overflow-y-auto scroll-smooth">
      <div class="max-w-5xl w-full mx-10 my-0">
        <slot />
      </div>
    </div>
  </NuxtLayout>
</template>
