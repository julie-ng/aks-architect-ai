<script setup lang="ts">
const chatsStore = useChatsStore()

// onMounted is intentional here — creating a session (POST + UUID generation)
// and redirecting are inherently client-side actions with no SSR benefit.
onMounted(async () => {
  const session = await chatsStore.newSession()
  navigateTo(chatsStore.sessionPath(session.id), { replace: true })
})
</script>

<template>
  <div />
</template>
