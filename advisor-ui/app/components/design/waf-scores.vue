<script setup lang="ts">
const props = withDefaults(defineProps<{
  designId: string
  scores: Record<string, number>
  baseline?: Record<string, number>
}>(), {
  baseline: () => ({})
})

const designsStore = useDesignsStore()
</script>

<template>
  <div class="space-y-3">
    <h3 class="mb-1 font-semibold">
      Design Scores
    </h3>
    <p class="mt-0 mb-6 text-xs text-muted">
      The baseline is determined based on your chosen requirements. The score band is based on your architectural decisions.
    </p>
    <DesignWafScoreBar
      v-for="(score, pillar) in scores"
      :key="pillar"
      :pillar="String(pillar)"
      :score="score"
      :baseline="props.baseline[pillar] ?? 0"
    />

    <USeparator class="my-5" />

    <p class="mb-6 text-xs text-muted">
      If your business requirements are met, your score band and baseline should overlap.
    </p>

    <UButton
      label="Discuss with AI"
      color="primary"
      size="lg"
      class="cursor-pointer w-full justify-center"
      icon="i-lucide-bot-message-square"
      @click="designsStore.startChat(props.designId)"
    />

  </div>
</template>
