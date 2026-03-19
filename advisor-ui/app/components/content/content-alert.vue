<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  icon?: string
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  variant?: 'solid' | 'outline' | 'soft' | 'subtle'
}>()
</script>

<template>
  <UAlert
    :title="title"
    :description="description"
    :icon="icon"
    :color="color"
    :variant="variant"
    class="my-4"
  >
    <template v-if="$slots.default" #description>
      <slot mdc-unwrap="p" />
    </template>
  </UAlert>
</template>
