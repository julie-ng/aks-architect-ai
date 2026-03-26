<script setup lang="ts">
const props = defineProps<{
  chatId: string
}>()

const chatsStore = useChatsStore()
const designsStore = useDesignsStore()

const session = computed(() => chatsStore.getSession(props.chatId))
const linkedDesign = computed(() => {
  const did = session.value?.designId
  return did ? designsStore.get(did) : null
})

// Rename modal state
const renameOpen = ref(false)
const renameInput = ref('')

const chatActionItems = [[
  {
    label: 'Rename',
    icon: 'i-lucide-pencil',
    onSelect () {
      renameInput.value = chatsStore.getSession(props.chatId)?.title ?? ''
      renameOpen.value = true
    },
  },
  {
    label: 'Delete',
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
</script>

<template>
  <UDashboardNavbar>
    <template #default>
      <span class="font-semibold text-sm truncate">
        {{ chatsStore.getSession(chatId)?.title ?? 'Chat' }}
      </span>
      <NuxtLink
        v-if="linkedDesign"
        :to="`/designs/${session?.designId}`"
        class="text-xs text-muted hover:text-default ml-2 truncate"
      >
        {{ linkedDesign.title }}
      </NuxtLink>
    </template>
    <template #right>
      <UDropdownMenu :items="chatActionItems">
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

  <UModal v-model:open="renameOpen" title="Rename chat">
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
</template>
