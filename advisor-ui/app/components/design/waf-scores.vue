<script setup lang="ts">
defineProps<{
  scores: Record<string, number>
}>()
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
    />
  </div>
</template>
