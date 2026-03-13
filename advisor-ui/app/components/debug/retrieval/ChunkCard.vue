<script setup lang="ts">
import type { RetrieveChunk } from '~/types/retrieval'

defineProps<{
  chunk: RetrieveChunk
  index: number
}>()
</script>

<template>
  <UCard>
    <div class="space-y-3">
      <div class="flex gap-8">
        <!-- Text preview (70%) -->
        <div class="w-[70%]">
          <p class="mb-3 text-sm text-toned font-medium">{{ chunk.title }}</p>
          <pre class=" text-xs text-muted bg-elevated rounded p-3 overflow-x-auto whitespace-pre-wrap">{{ chunk.text }}</pre>
          <p class="py-2 leading-none">
            <a
              :href="chunk.url"
              target="_blank"
              class="text-xs text-muted break-all hover:underline"
            >
              {{ chunk.url }}
            </a>
          </p>
        </div>
        <!-- Scores + Metadata (30%) -->
        <div class="w-[30%] shrink-0 space-y-3">
          <DebugRetrievalChunkUuid :uuid="chunk.id" />
          <DebugRetrievalChunkScores
            :score="chunk.score"
            :boosted-score="chunk.boosted_score"
          />
          <DebugRetrievalChunkMetadata :tags="chunk.tags" :priority="chunk.priority" />
        </div>
      </div>
    </div>
  </UCard>
</template>
