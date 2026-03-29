<script setup lang="ts">
const props = defineProps<{
  proposal: {
    type: string
    key: string
    value: string
    question: string
    label: string
  }
  designId: string | null
}>()

const emit = defineEmits<{
  accept: [text: string]
}>()

const accepted = ref(false)
const dismissed = ref(false)

const designsStore = useDesignsStore()

/**
 * Save the proposed decision/requirement to the DB and emit accept event.
 */
async function onAccept () {
  if (!props.designId) return

  if (props.proposal.type === 'decision') {
    await designsStore.patchDecision(props.designId, props.proposal.key, props.proposal.value)
  }
  else {
    await designsStore.patchRequirement(props.designId, props.proposal.key, props.proposal.value)
  }

  accepted.value = true
  emit('accept', `${props.proposal.question} → ${props.proposal.label}`)
}

/**
 * Dismiss the proposal without saving.
 */
function onDismiss () {
  dismissed.value = true
}
</script>

<template>
  <div v-if="accepted" class="text-sm text-green-600 dark:text-green-400 py-2">
    Saved: {{ proposal.question }} → {{ proposal.label }}
  </div>
  <div v-else-if="dismissed" class="text-sm text-muted py-2">
    Dismissed
  </div>
  <div v-else class="p-4 space-y-3 bg-slate-100">
    <p class="text-sm font-medium text-indigo-800">
      {{ proposal.question }}
    </p>
    <p class="text-sm text-slate-600">Suggestion: <strong class="text-slate-800">{{ proposal.label }}</strong>
    </p>
    <div class="flex gap-2">
      <UButton
        label="Accept"
        color="primary"
        size="sm"
        class="cursor-pointer"
        @click="onAccept"
      />
      <UButton
        label="Decline"
        variant="subtle"
        color="neutral"
        size="sm"
        class="cursor-pointer"
        @click="onDismiss"
      />
    </div>
  </div>
</template>
