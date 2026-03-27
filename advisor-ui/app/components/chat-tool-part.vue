<script setup lang="ts">
import { isToolStreaming } from '@nuxt/ui/utils/ai'

const props = defineProps<{
  part: {
    type: string
    state: string
    toolCallId: string
    input?: unknown
    output?: {
      found: boolean
      title: string | null
      requirements: Record<string, string | string[]>
      decisions: Record<string, string | string[]>
    }
    errorText?: string
  }
}>()

const isStreaming = computed(() =>
  props.part.state === 'input-streaming' || props.part.state === 'input-available',
)

const toolText = computed(() =>
  isStreaming.value ? 'Loading design snapshot...' : 'Loaded design snapshot',
)

watchEffect(() => {
  console.log('[tool-part]', props.part.state, props.part.type)
})

</script>

<template>
  <div>
    <UChatTool
      v-if="part.type === 'tool-getDesignSnapshot'"
      :streaming="isToolStreaming(props.part)"
      :text="toolText"
      icon="i-lucide-clipboard-list"
    >
      <template v-if="part.state === 'output-available' && part.output?.found">
        <design-snapshot-card
          :title="part.output.title"
          :requirements="part.output.requirements"
          :decisions="part.output.decisions"
        />
      </template>
      <div
        v-else-if="part.state === 'output-available' && !part.output?.found"
        class="text-sm text-muted py-2"
      >
        Design no longer available.
      </div>
    </UChatTool>

    <UAlert
      v-else-if="part.state === 'output-error'"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Could not load design snapshot"
      :description="part.errorText"
      class="my-2"
    />
  </div>
</template>
