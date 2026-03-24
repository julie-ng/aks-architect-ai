<script setup lang="ts">
const route = useRoute()
const { loggedIn } = useUserSession()
const chatsStore = useChatsStore()

// SSR: fetch chat sessions on server, hydrate on client (no layout shift)
await callOnce('chat-sessions', () => chatsStore.fetchSessions())

const { data: guidePages } = await useAsyncData('guide-pages', () => {
  return queryCollection('guide')
    .select('title', 'path')
    .all()
})

const links = computed(() => {
  const groups = [
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
        to: '/designs',
        icon: 'i-lucide-origami', // goal
      },
    ],
    [
      {
        label: 'Debug - Retrieval',
        to: '/_debug/retrieval',
        icon: 'i-lucide-database-search',
      },
    ],
  ]

  if (loggedIn.value) {
    groups.push([
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
            to: '/chat/new',
          },
          ...chatsStore.sortedSessions.map(session => ({
            label: session.title,
            icon: 'i-lucide-messages-square',
            to: `/chat/${session.id}`,
          })),
        ],
      },
    ])
  }

  return groups
})
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
      <!-- [Sidebar] Header -->
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

      <!-- [Sidebar] Navigation Menu + Chat List -->
      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="links"
          orientation="vertical"
          :ui="collapsed ? { link: 'overflow-hidden px-1.5' } : {}"
        />
        <div v-if="loggedIn && !collapsed" class="mt-1 px-2">
          <UButton
            label="New Chat"
            to="/chat/new"
            color="secondary"
            variant="subtle"
            block
            size="sm"
            class="cursor-pointer"
          />
        </div>
        <div v-if="loggedIn && collapsed" class="-mt-2 flex justify-center">
          <UButton
            icon="i-lucide-plus"
            to="/chat/new"
            color="primary"
            variant="solid"
            size="xs"
            class="cursor-pointer"
          />
        </div>
      </template>

      <!-- [Sidebar] Footer: User / Login -->
      <template #footer="{ collapsed }">
        <SidebarFooter :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <!-- Main Content -->
    <slot />
  </UDashboardGroup>
</template>
