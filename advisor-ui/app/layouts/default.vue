<script setup lang="ts">
const route = useRoute()
const { loggedIn } = useUserSession()
const chatsStore = useChatsStore()

onMounted(async () => {
  if (loggedIn.value) {
    await chatsStore.fetchSessions()
  }
})

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
        to: '/designer',
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

function newChat () {
  navigateTo('/chat/new')
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
          :ui="collapsed ? { link: 'overflow-hidden px-1.5' } : {}"
        />
        <div v-if="loggedIn && !collapsed" class="mt-1 px-2">
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

      <!-- Footer: User / Login -->
      <template #footer="{ collapsed }">
        <!-- eslint-disable-next-line vue/no-template-shadow -->
        <AuthState v-slot="{ loggedIn, user, clear }">
          <template v-if="loggedIn">
            <div v-if="!collapsed" class="flex items-center justify-between">
              <UUser
                :name="user?.name"
                :avatar="{ src: user?.avatarUrl, alt: user?.name }"
                size="sm"
              />
              <UButton
                icon="i-lucide-log-out"
                color="neutral"
                variant="ghost"
                size="xs"
                class="cursor-pointer"
                @click="clear"
              />
            </div>
            <UButton
              v-else
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              size="sm"
              class="cursor-pointer"
              @click="clear"
            />
          </template>
          <template v-else>
            <UButton
              v-if="!collapsed"
              label="Login with GitHub"
              icon="i-simple-icons-github"
              to="/api/auth/github"
              color="neutral"
              variant="subtle"
              block
              external
              size="sm"
              class="cursor-pointer"
            />
            <UButton
              v-else
              icon="i-simple-icons-github"
              to="/api/auth/github"
              color="neutral"
              variant="ghost"
              size="sm"
              class="cursor-pointer"
              external
            />
          </template>
        </AuthState>
      </template>
    </UDashboardSidebar>

    <!-- Main Content -->
    <slot />
  </UDashboardGroup>
</template>
