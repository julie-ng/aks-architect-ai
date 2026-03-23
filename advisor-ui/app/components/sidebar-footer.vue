<script setup lang="ts">
defineProps<{
  collapsed: boolean
}>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-template-shadow -->
  <AuthState v-slot="{ loggedIn, user, clear }">
    <template v-if="loggedIn">

      <!-- User Avatar + Logout (expanded) -->
      <div v-if="!collapsed" class="flex items-center justify-between w-full">
        <UUser
          :name="user?.name"
          :avatar="{ src: user?.avatarUrl, alt: user?.name }"
          size="sm"
        />
        <UTooltip
          :content="{
            align: 'center',
            side: 'top',
            sideOffset: 1
          }"
          text="Logout"
        >
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            size="xs"
            class="cursor-pointer"
            @click="clear"
          />
        </UTooltip>
      </div>

      <!-- Logout Button (collapsed) -->
      <UTooltip
        v-else
        :content="{
          align: 'center',
          side: 'right',
          sideOffset: 8
        }"
        text="Logout"
      >
        <UButton
          icon="i-lucide-log-out"
          color="neutral"
          variant="ghost"
          size="sm"
          class="cursor-pointer"
          @click="clear"
        />
      </UTooltip>
    </template>
    <template v-else>

      <!-- Login Button (Expanded) -->
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

      <!-- Login Button (Collapsed) -->
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
