<script setup lang="ts">
import { getToolName } from 'ai'

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
  chatStatus: string
}>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toolName = computed(() => getToolName(props.part as any))

// AI SDK mutates part.state in place — Vue can't detect the transition.
// Use chat.status as the reactive signal: tool is streaming until chat is done.
const isStreaming = computed(() =>
  props.chatStatus === 'streaming' || props.chatStatus === 'submitted',
)

onMounted(() => {
  console.log('[chat-tool-part] mount', {
    toolName: toolName.value,
    state: props.part.state,
    chatStatus: props.chatStatus,
    toolCallId: props.part.toolCallId,
  })
})

watch(isStreaming, (streaming) => {
  console.log('[chat-tool-part] streaming:', streaming, '| chatStatus:', props.chatStatus)
})
</script>

<template>
  <UChatTool
    v-if="toolName === 'getDesignSnapshot'"
    :text="isStreaming ? 'Loading design snapshot...' : 'Loaded design snapshot'"
    :streaming="isStreaming"
    icon="i-lucide-clipboard-list"
  >
    <template v-if="!isStreaming && part.output?.found">
      <design-snapshot-card
        :title="part.output.title"
        :requirements="part.output.requirements"
        :decisions="part.output.decisions"
      />
    </template>

    <div
      v-else-if="!isStreaming && part.output && !part.output.found"
      class="text-sm text-muted py-2"
    >
      Design no longer available.
    </div>

    <UAlert
      v-else-if="!isStreaming && part.errorText"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Could not load design snapshot"
      :description="part.errorText"
    />
  </UChatTool>
</template>
