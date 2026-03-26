<script setup>
const props = defineProps({
  hasNavbar: {
    type: Boolean,
    required: false,
    default: true
  },
  hasToolbar: {
    type: Boolean,
    required: false,
    default: false
  }
})
</script>

<template>
  <UDashboardPanel id="designs-panel">
    <template #header>
      <UDashboardNavbar v-if="props.hasNavbar" icon="i-lucide-drafting-compass">
        <template #title>
          <!-- [Slot] Navbar (title) -->
          <slot name="navbar-title">
            <NuxtLink to="/designs">
              <span class="font-normal text-sm">Planner</span>
            </NuxtLink>
          </slot>
        </template>

        <template #trailing>
          <div class="text-sm">
            <!-- [Slot] Navbar (trailing) -->
            <slot name="navbar-trailing"/>
          </div>
        </template>

        <template #right>
          <!-- [Slot] Navbar (right) -->
          <slot name="navbar-right"/>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar v-if="props.hasToolbar">
        <template #left>
          <!-- [Slot] Toolbar (left) -->
          <slot name="toolbar-left" />
        </template>
        <template #right>
          <!-- [Slot] Toolbar (right) -->
          <slot name="toolbar-right" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="w-full overflow-y-auto scroll-smooth">
        <div class="flex gap-2">
          <div class="max-w-3xl basis-7/10 min-w-0">
            <UContainer>
              <!-- [Slot] Body -->
              <slot name="body" />
            </UContainer>
          </div>
          <div class="basis-3/10 min-w-0 sticky top-0 self-start">
            <!-- [Slot] Sticky Sidebar -->
            <slot name="sticky-sidebar" />
          </div>
        </div>
      </div>
    </template>

  </UDashboardPanel>
</template>
