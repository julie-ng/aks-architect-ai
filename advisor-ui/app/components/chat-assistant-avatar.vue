<script setup lang="ts">
defineProps<{
  icon: string
  pulsing: boolean
  pinging: boolean
}>()
</script>

<template>
  <div class="relative flex items-center justify-center size-10">
    <span
      v-if="pinging"
      class="absolute size-7 rounded-full bg-indigo-200 animate-ping"
    />
    <div
      class="relative size-10 rounded-full bg-indigo-100 flex items-center justify-center"
      :class="{ 'animate-pulse': pulsing }"
    >
      <UIcon :name="icon" class="size-6 text-primary" />
    </div>
  </div>
</template>
