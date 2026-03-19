<script setup lang="ts">
const route = useRoute()
const { sortedSessions, renameSession, deleteSession, getSession } = useChatSessions()


const { data: guidePages } = await useAsyncData('guide-pages', () => {
  return queryCollection('guide')
    .select('title', 'path')
    .all()
})

const links = computed(() => [
  [
    {
      label: 'Home',
      to: '/',
      icon: 'i-lucide-home',
    },
    {
      label: 'AKS Guide',
      to: '/guide',
      icon: 'i-lucide-book-text', // noteboook-text
      defaultOpen: route.path.startsWith('/guide'),
      children: guidePages.value?.map(p => ({
        label: p.title,
        to: p.path,
      })),
    },
    {
      label: 'Design Wizard',
      to: '/designer',
      icon: 'i-lucide-origami', // goal
    },
  ],
  [
    {
      label: 'Retrieval (Debug)',
      to: '/_debug/retrieval',
      icon: 'i-lucide-database-search',
    },
  ],
  [
    {
      label: 'Chat',
      to: '/chat',
      icon: 'i-lucide-bot-message-square',
      defaultOpen: true,
      active: route.path.startsWith('/chat'),
      children: [
        {
          label: 'New Chat',
          icon: 'i-lucide-plus',
          to: '/chat/',
        },
        ...sortedSessions.value.map(session => ({
          label: session.title,
          icon: 'i-lucide-messages-square',
          to: `/chat/${session.id}`,
          slot: 'chat-session' as const,
          sessionId: session.id,
        })),
      ],
    },
  ],
])

function newChat () {
  navigateTo(`/chat/${crypto.randomUUID()}`)
}

// Rename modal state
const renameModalOpen = ref(false)
const renameInput = ref('')
const renameSessionId = ref('')

function startRename (sessionId: string) {
  const session = getSession(sessionId)
  if (!session) return
  renameSessionId.value = sessionId
  renameInput.value = session.title
  renameModalOpen.value = true
}

function confirmRename () {
  const trimmed = renameInput.value.trim()
  if (trimmed && renameSessionId.value) {
    renameSession(renameSessionId.value, trimmed)
  }
  renameModalOpen.value = false
}

function chatActionItems (sessionId: string) {
  return [[
    {
      label: 'Rename',
      icon: 'i-lucide-pencil',
      onSelect: () => startRename(sessionId),
    },
    {
      label: 'Delete',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => deleteSession(sessionId),
    },
  ]]
}
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      id="default"
      :default-size="15"
      :min-size="15"
      :max-size="25"
      resizable
      collapsible
      class="bg-elevated/25"
      :ui="{ header: 'lg:border-b lg:border-default', footer: 'lg:border-t lg:border-default' }"
    >
      <!-- Header -->
      <template #header="{ collapsed }">
        <UDashboardSidebarCollapse
          icon="i-lucide-menu"
          size="sm"
          color="neutral"
          class="rounded-full cursor-pointer text-default"
          variant="ghost"
        />

        <div v-if="!collapsed" class="px-2 font-bold text-sm">
          AKS Architect
        </div>
      </template>

      <!-- Navigation Menu + Chat List -->
      <template #default="{ collapsed }">
        <ClientOnly>
          <UNavigationMenu
            :items="links"
            orientation="vertical"
            :ui="collapsed ? { link: 'overflow-hidden px-1.5' } : { childLink: 'group' }"
          >
            <template #chat-session-trailing="{ item }">
              <UDropdownMenu :items="chatActionItems((item as any).sessionId)">
                <UButton
                  icon="i-lucide-ellipsis"
                  color="neutral"
                  variant="ghost"
                  size="2xs"
                  class="opacity-0 group-hover:opacity-100 cursor-pointer"
                />
              </UDropdownMenu>
            </template>
          </UNavigationMenu>
        </ClientOnly>
        <div v-if="!collapsed" class="mt-1 px-2">
          <UButton
            label="New Chat"
            color="secondary"
            variant="subtle"
            block
            size="sm"
            class="cursor-pointer"
            @click="newChat"
          />
        </div>
      </template>
    </UDashboardSidebar>

    <!-- Rename Modal -->
    <UModal v-model:open="renameModalOpen">
      <template #body>
        <div class="flex flex-col gap-4">
          <p class="font-medium">
            Rename chat
          </p>
          <UInput
            v-model="renameInput"
            placeholder="Chat title"
            autofocus
            @keydown.enter="confirmRename" />
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="renameModalOpen = false" />
            <UButton label="Rename" @click="confirmRename" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Main Content -->
    <slot />
  </UDashboardGroup>
</template>
