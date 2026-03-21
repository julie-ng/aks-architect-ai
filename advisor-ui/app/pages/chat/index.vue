<script setup lang="ts">
const chatsStore = useChatsStore()

onMounted(async () => { // otherwise server always overrides with new session
  const session = chatsStore.hasSessions
    ? chatsStore.latestSession
    : await chatsStore.newSession()
  navigateTo(chatsStore.sessionPath(session.id), { replace: true })
})
</script>

<template>
  <div />
</template>
