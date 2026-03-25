<script setup lang="ts">
const props = withDefaults(defineProps<{
  scores: Record<string, number>
  baseline?: Record<string, number>
}>(), {
  baseline: () => ({})
})
</script>

<template>
  <div class="space-y-3">
    <h3 class="text-sm font-semibold">
      WAF Pillar Scores
    </h3>
    <DesignWafScoreBar
      v-for="(score, pillar) in scores"
      :key="pillar"
      :pillar="String(pillar)"
      :score="score"
      :baseline="props.baseline[pillar] ?? 0"
    />
  </div>
</template>
