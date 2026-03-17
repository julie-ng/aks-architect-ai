<script setup lang="ts">
const { sortedSessions, deleteSession } = useChatSessions()

const links = computed(() => [
  [
    {
      label: 'Home',
      to: '/',
      icon: 'i-lucide-home',
    },
    {
      label: 'Chat',
      to: '/chat',
      icon: 'i-lucide-bot-message-square',
    },
  ],
  [
    {
      label: 'Retrieval',
      to: '/_debug/retrieval',
      icon: 'i-lucide-database-search',
    },
  ],
])

function newChat() {
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

        <template v-if="!collapsed">
          <div class="mt-4 px-2">
            <UButton
              icon="i-lucide-plus"
              label="New Chat"
              color="neutral"
              variant="ghost"
              block
              size="sm"
              @click="newChat"
            />
          </div>

          <nav v-if="sortedSessions.length > 0" class="mt-2 flex flex-col gap-0.5 px-2 overflow-y-auto">
            <div
              v-for="session in sortedSessions"
              :key="session.id"
              class="group flex items-center gap-1 rounded-md hover:bg-elevated px-2 py-1.5 text-sm"
            >
              <NuxtLink
                :to="`/chat/${session.id}`"
                class="flex-1 truncate text-muted hover:text-default"
                active-class="text-default font-medium"
              >
                {{ session.title }}
              </NuxtLink>
              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="2xs"
                class="opacity-0 group-hover:opacity-100 shrink-0"
                @click.prevent="deleteSession(session.id)"
              />
            </div>
          </nav>
        </template>
      </template>
    </UDashboardSidebar>

    <!-- Main Content -->
    <slot />
  </UDashboardGroup>
</template>
