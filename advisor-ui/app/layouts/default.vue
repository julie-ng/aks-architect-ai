<script setup lang="ts">
// const open = ref(false)

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
])

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
          variant="ghost" />

        <div v-if="!collapsed" class="px-2 font-bold text-sm">
          AKS Architect
        </div>
      </template>

      <!-- Navigation Menu -->
      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="links"
          orientation="vertical"
          :ui="collapsed ? { link: 'overflow-hidden px-1.5' } : undefined"
        />
      </template>
    </UDashboardSidebar>

    <!-- Main Content -->
    <slot />
  </UDashboardGroup>
</template>
