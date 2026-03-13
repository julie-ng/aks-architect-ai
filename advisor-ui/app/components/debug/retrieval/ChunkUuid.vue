<script setup lang="ts">
defineProps<{
  uuid: string
}>()

function uuidColor (uuid: string): string {
  return '#' + uuid.replace(/-/g, '').slice(0, 6)
}
</script>

<template>
  <div class="flex items-center gap-2 mt-1 mb-5 max-w-[80%]">
    <span
      class="inline-block size-3 rounded-sm shrink-0"
      :style="{ backgroundColor: uuidColor(uuid) }"
    />
    <span class="text-xs text-muted font-mono cursor-default opacity-60 truncate" :title="uuid">{{ uuid }}</span>
  </div>
</template>
