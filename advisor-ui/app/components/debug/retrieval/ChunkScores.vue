<script setup lang="ts">
defineProps<{
  score: number
  boostedScore: number
}>()
</script>

<template>
  <div class="mb-6">
    <!-- <h3 class="my-2 text-sm text-toned font-medium">Scores</h3> -->
    <table class="text-sm border-collapse border border-default">
      <tbody>
        <tr>
          <td class="border border-default px-3 py-1 text-muted">Raw Score</td>
          <td class="border border-default px-3 py-1 font-mono text-right text-muted">{{ score.toFixed(4) }}</td>
        </tr>
        <tr>
          <td class="border border-default px-3 py-1 text-muted">Boosted Score</td>
          <td class="border border-default px-3 py-1 font-mono text-right text-cyan-600">{{ boostedScore.toFixed(4) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
