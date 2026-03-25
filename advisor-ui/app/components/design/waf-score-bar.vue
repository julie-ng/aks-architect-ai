<script setup lang="ts">
const props = withDefaults(defineProps<{
  pillar: string
  score: number
  min?: number
  max?: number
  baseline?: number
  bandWidth?: number
}>(), {
  min: -10,
  max: 10,
  baseline: 0,
  bandWidth: 1
})

const range = computed(() => props.max - props.min)

function toPercent (value: number): number {
  return ((value - props.min) / range.value) * 100
}

const bandLeft = computed(() => {
  const left = toPercent(Math.max(props.score - props.bandWidth, props.min))
  return `${left}%`
})

const bandRight = computed(() => {
  const right = 100 - toPercent(Math.min(props.score + props.bandWidth, props.max))
  return `${right}%`
})

</script>

<template>
  <div>
    <div class="flex justify-between text-xs mb-1">
      <span class="text-muted capitalize">{{ pillar }}</span>
      <span class="font-medium">{{ score }}</span>
    </div>
    <div class="relative h-6 w-full bg-muted rounded">
      <!-- Baseline marker -->
      <div
        class="absolute -top-1 -bottom-1 w-0.5 bg-neutral-300 transition-[left] duration-300"
        :style="{ left: `${toPercent(baseline)}%` }"
      />
      <!-- Score band -->
      <div
        class="absolute top-1 bottom-1 rounded-sm bg-secondary/80 transition-[left,right] duration-300"
        :style="{ left: bandLeft, right: bandRight }"
      />
    </div>
  </div>
</template>
