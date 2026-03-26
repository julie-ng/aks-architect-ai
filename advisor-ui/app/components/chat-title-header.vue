<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{
  chatId: string
}>()

const chatsStore = useChatsStore()
const designsStore = useDesignsStore()

const session = computed(() => chatsStore.getSession(props.chatId))
const linkedDesignId = computed(() => session.value?.designId ?? null)
const linkedDesign = computed(() => {
  const designId = linkedDesignId.value
  return designId ? designsStore.get(designId) : null
})

// Modal state
const renameOpen = ref(false)
const detailsOpen = ref(false)
const renameInput = ref('')

const chatActionItems = [[
  {
    label: 'Rename Chat',
    icon: 'i-lucide-pencil',
    onSelect () {
      renameInput.value = chatsStore.getSession(props.chatId)?.title ?? ''
      renameOpen.value = true
    },
  },
  {
    label: 'Delete Chat',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    async onSelect () {
      await chatsStore.deleteSession(props.chatId)
      await navigateTo('/chat')
    },
  },
]]

function confirmRename () {
  const trimmed = renameInput.value.trim()
  if (trimmed) {
    chatsStore.renameSession(props.chatId, trimmed)
  }
  renameOpen.value = false
}

const otherDesigns = computed(() =>
  designsStore.sortedDesigns.filter(d => d.id !== session.value?.designId),
)
const hasOtherDesigns = computed(() => otherDesigns.value.length > 0)

const designDropdownItems = computed<DropdownMenuItem[][]>(() => {
  const designId = session.value?.designId
  if (!designId || !linkedDesign.value) return []

  const groups: DropdownMenuItem[][] = [
    [
      {
        label: 'Details',
        icon: 'i-lucide-eye',
        onSelect () {
          detailsOpen.value = true
        },
      },
      {
        label: 'Configure',
        icon: 'i-lucide-settings-2',
        to: `/designs/${designId}/configure`,
      },
    ],
  ]

  if (hasOtherDesigns.value) {
    groups.push([
      {
        label: 'Chat about',
        icon: 'i-lucide-drafting-compass',
        children: otherDesigns.value.map(d => ({
          label: d.title || 'Untitled Design',
          icon: 'i-lucide-map',
          onSelect: () => designsStore.openChat(d.id),
        })),
      },
    ])
  }

  return groups
})
</script>

<template>
  <UDashboardNavbar icon="i-lucide-bot-message-square">
    <template #title>
      <span class="font-semibold text-sm truncate">
        {{ chatsStore.getSession(chatId)?.title ?? 'Chat' }}
      </span>
    </template>
    <template #right>
      <UDropdownMenu v-if="linkedDesign" :items="designDropdownItems">
        <UButton
          :label="linkedDesign.title"
          icon="i-lucide-drafting-compass"
          size="sm"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-chevron-down"
        />
      </UDropdownMenu>
      <UDropdownMenu :items="chatActionItems" :ui="{ content: 'min-w-40' }">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="ghost"
          size="xs"
          class="cursor-pointer"
        />
      </UDropdownMenu>
    </template>
  </UDashboardNavbar>

  <UModal
    v-model:open="renameOpen"
    title="Rename chat"
    description="Enter a new name for this chat"
    :ui="{ description: 'sr-only' }">
    <template #body>
      <div class="flex flex-col gap-4">
        <UInput
          v-model="renameInput"
          placeholder="Chat title"
          autofocus
          @keydown.enter="confirmRename"
        />
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="renameOpen = false"
          />
          <UButton label="Rename" @click="confirmRename" />
        </div>
      </div>
    </template>
  </UModal>

  <UModal
    v-if="linkedDesign"
    v-model:open="detailsOpen"
    :title="linkedDesign.title"
    description="Design requirements and architectural decisions"
    :ui="{ content: 'max-w-2xl', description: 'sr-only' }"
  >
    <template #body>
      <DesignRequirements :design-id="linkedDesignId!" class="mb-4" />
      <DesignDecisions :design-id="linkedDesignId!" class="mt-8 mb-4" />
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Configure"
          icon="i-lucide-settings-2"
          color="neutral"
          :to="designsStore.getConfigurePath(linkedDesignId!)"
          variant="subtle"
        />
        <UButton
          label="Return to chat"
          icon="i-lucide-bot-message-square"
          color="neutral"
          variant="subtle"
          class="cursor-pointer"
          @click="detailsOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>
