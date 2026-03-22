<script setup lang="ts">
definePageMeta({ layout: false })

useHead({
  title: 'Login'
})

const route = useRoute()
const hasError = computed(() => route.query.error === 'github_oauth_error')
const { loggedIn, user, session, clear: logout } = useUserSession()
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="flex flex-col gap-4 max-w-sm w-full">
      <UPageCard class="w-full max-w-md">
        <div v-if="loggedIn">
          <h1>Welcome {{ user.login }}!</h1>
          <p>Logged in since {{ session.loggedInAt }}</p>
          <button @click="logout">Logout</button>
        </div>
        <div v-else>
          <UAuthForm
            title="AKS Architect AI"
            description="Login to create chat sessions"
            icon="i-lucide-user"
          />

          <UButton
            v-if="!loggedIn"
            to="/api/auth/github"
            icon="i-simple-icons-github"
            label="Login with GitHub"
            color="success"
            size="md"
            external
            block
            class="py-3"
          />
          <UAlert
            v-if="hasError"
            title="Login failed"
            description="GitHub authentication failed. Please try again."
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
          />
        </div>
      </UPageCard>
    </div>
  </div>
</template>
