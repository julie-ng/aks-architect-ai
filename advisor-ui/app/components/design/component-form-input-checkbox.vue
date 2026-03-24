<script setup lang="ts">
import type { DesignerAnswer } from '~/types/designer'

const props = defineProps<{
  name: string
  answers: DesignerAnswer[]
}>()

const modelValue = defineModel<string[] | null>({ default: () => [] })

const selectedKeys = computed(() => Array.isArray(modelValue.value) ? modelValue.value : [])

function getAnswerTitle (answer: DesignerAnswer) {
  return answer.label || answer.title || answer.key
}

function getHighlights (answer: DesignerAnswer) {
  const values = answer.highlights ?? answer.highglights
  return Array.isArray(values) ? values : []
}

function isSelected (key: string) {
  return selectedKeys.value.includes(key)
}

function toggle (key: string) {
  if (isSelected(key)) {
    modelValue.value = selectedKeys.value.filter(k => k !== key)
  }
  else {
    modelValue.value = [...selectedKeys.value, key]
  }
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
        isSelected(answer.key) ? 'bg-blue-50 hover:bg-blue-50' : ''
      ]"
      @click.prevent="!answer.disabled && toggle(answer.key)"
    >
      <input
        type="checkbox"
        :name="name"
        :value="answer.key"
        :checked="isSelected(answer.key)"
        :disabled="answer.disabled"
        class="mt-1"
        @click.stop
        @change="toggle(answer.key)"
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
