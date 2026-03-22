<script setup lang="ts">
import type { RetrieveResponse } from '~/types/retrieval'

definePageMeta({ middleware: 'require-user-id' })
useHead({ title: 'Retrieval Debug' })

const question = ref('')
const loading = ref(false)
const result = ref<RetrieveResponse | null>(null)
const error = ref<string | null>(null)
const sortBy = ref<'boosted_score' | 'score'>('boosted_score')

const sortedChunks = computed(() => {
  if (!result.value) return []
  return [...result.value.chunks].sort((a, b) => b[sortBy.value] - a[sortBy.value])
})

async function submit () {
  if (!question.value.trim()) return

  loading.value = true
  error.value = null
  result.value = null

  try {
    result.value = await $fetch<RetrieveResponse>('/api/_debug/retrieve', {
      method: 'POST',
      body: { question: question.value },
    })
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Request failed'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UContainer class="py-6 overflow-y-auto">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold mb-1">
        Debug Retrieval
      </h1>
      <p class="text-sm text-muted mb-4">
        Test the retrieval API — see what chunks come back for a given question and their scores.
      </p>

      <DebugRetrievalSearchForm
        v-model="question"
        :loading="loading"
        @submit="submit"
      />

      <!-- Error -->
      <div v-if="error" class="mt-4 p-3 rounded bg-red-500/10 text-red-500 text-sm">
        {{ error }}
      </div>

      <!-- Results -->
      <div v-if="result" class="mt-6 space-y-4">
        <div class="text-sm text-muted">
          Reformulated query: <span class="text-default font-medium">{{ result.reformulated_query }}</span>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-sm text-muted">
            {{ result.chunks.length }} chunk(s) returned
          </div>

          <!-- <p class="text-sm font-semibold">Sort by:</p>
          <URadioGroup
            v-model="sortBy"
            orientation="horizontal"
            size="sm"
            :items="[
              { label: 'Boosted score', value: 'boosted_score' },
              { label: 'Raw score', value: 'score' },
            ]"
          /> -->
        </div>

        <DebugRetrievalChunkCard
          v-for="(chunk, i) in sortedChunks"
          :key="chunk.id"
          :chunk="chunk"
          :index="i"
        />
      </div>
    </div>
  </UContainer>
</template>
