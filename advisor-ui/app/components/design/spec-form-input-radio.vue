<script setup lang="ts">
import type { SpecAnswer } from '~~/shared/types/spec'

const props = defineProps<{
  name: string
  answers: SpecAnswer[]
}>()

const selectedKey = defineModel<string | null>({ default: null })

function onReset () {
  selectedKey.value = null
}

function getAnswerTitle (answer: SpecAnswer) {
  return answer.label || answer.key
}

function getHighlights (answer: SpecAnswer) {
  return answer.highlights ?? []
}
</script>

<template>
  <div class="space-y-3">
    <UButton
      v-if="selectedKey"
      label="Reset Answer"
      icon="i-lucide-x"
      variant="outline"
      color="neutral"
      size="xs"
      class="mt-1 cursor-pointer"
      @click="onReset"
    />

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
        <p class="text-sm font-semibold inline-flex items-center gap-2">
          {{ getAnswerTitle(answer) }}
          <UBadge
            v-if="answer.tag"
            :label="answer.tag.text"
            :color="(answer.tag.color as any) || 'neutral'"
            :variant="(answer.tag.variant as any) || 'soft'"
            size="sm"
          />
        </p>

        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-if="answer.description" class="text-sm text-muted" v-html="renderInlineBoldText(answer.description)" />

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
