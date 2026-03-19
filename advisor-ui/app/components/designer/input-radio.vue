<script setup lang="ts">
type DesignerAnswer = {
  key: string
  label?: string
  title?: string
  description?: string
  highlights?: string[]
  highglights?: string[]
  disabled?: boolean
}

const props = defineProps<{
  name: string
  answers: DesignerAnswer[]
}>()

const selectedKey = ref<string | null>(null)

function getAnswerTitle (answer: DesignerAnswer) {
  return answer.label || answer.title || answer.key
}

function getHighlights (answer: DesignerAnswer) {
  const values = answer.highlights ?? answer.highglights
  return Array.isArray(values) ? values : []
}
</script>

<template>
  <div class="space-y-3">
    <label
      v-for="answer in props.answers"
      :key="answer.key"
      class="flex items-start gap-3 rounded-md border border-default p-3 transition-colors"
      :class="[
        answer.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-elevated/40',
        selectedKey === answer.key ? 'bg-blue-50 hover:bg-blue-50' : ''
      ]"
    >
      <input
        v-model="selectedKey"
        type="radio"
        :name="name"
        :value="answer.key"
        :disabled="answer.disabled"
        class="mt-1"
      >

      <div class="space-y-2">
        <p class="text-sm font-semibold">
          {{ getAnswerTitle(answer) }}
        </p>

        <p v-if="answer.description" class="text-sm text-muted">
          {{ answer.description }}
        </p>

        <ul
          v-if="getHighlights(answer).length"
          class="list-disc pl-5 text-sm text-muted space-y-1"
        >
          <li
            v-for="(highlight, highlightIndex) in getHighlights(answer)"
            :key="`${answer.key}-highlight-${highlightIndex}`"
          >
            {{ highlight }}
          </li>
        </ul>
      </div>
    </label>
  </div>
</template>
