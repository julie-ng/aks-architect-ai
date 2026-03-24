<script setup>
</script>
<template>
  <UDashboardPanel id="designs-panel">
    <template #header>
      <UDashboardNavbar icon="i-lucide-origami">
        <template #title>
          <!-- [Slot] Navbar (title) -->
          <slot name="navbar-title">
            <NuxtLink to="/designs">
              <span class="font-normal text-sm">Designs</span>
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
    </template>

    <template #body>
      <div class="w-full overflow-y-auto scroll-smooth">
        <UContainer class="overflow-y-auto">
          <div class="max-w-3xl">
            <!-- [Slot] Body -->
            <slot name="body"/>
          </div>
        </UContainer>
      </div>
    </template>

  </UDashboardPanel>
</template>
