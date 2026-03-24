<script setup lang="ts">
export type SavingStatus = 'saving' | 'success' | 'error' | null

const props = withDefaults(defineProps<{
  status: SavingStatus
  isAutomatic?: boolean
}>(), {
  isAutomatic: false
})

const config = computed(() => {
  const prefix = props.isAutomatic ? 'Auto-' : ''
  switch (props.status) {
    case 'saving':
      return {
        color: 'text-muted',
        icon: 'i-lucide-refresh-cw',
        label: `${prefix}Saving…`,
        spin: true
      }
    case 'success':
      return {
        color: 'text-success',
        icon: 'i-lucide-check',
        label: `${prefix}Saved`,
        spin: false
      }
    case 'error':
      return {
        color: 'text-error',
        icon: 'i-lucide-triangle-alert',
        label: `${prefix}Save failed`,
        spin: false
      }
    default:
      return null
  }
})
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    leave-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <p
      v-if="config"
      :key="status!"
      :class="[config.color, 'font-medium text-xs inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-full']"
    >
      <UIcon :name="config.icon" :class="['size-4', { 'animate-spin': config.spin }]" />
      {{ config.label }}
    </p>
  </Transition>
</template>
