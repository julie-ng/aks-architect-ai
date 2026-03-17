<script setup lang="ts">
const { sortedSessions } = useChatSessions()

const links = computed(() => [
  [
    {
      label: 'Home',
      to: '/',
      icon: 'i-lucide-home',
    },
    {
      label: 'Retrieval',
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
        })),
      ],
    },
  ],
])

function newChat () {
  navigateTo(`/chat/${crypto.randomUUID()}`)
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
        <UNavigationMenu
          :items="links"
          orientation="vertical"
          :ui="collapsed ? { link: 'overflow-hidden px-1.5' } : undefined"
        />
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

    <!-- Main Content -->
    <slot />
  </UDashboardGroup>
</template>
