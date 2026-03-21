<script setup lang="ts">
const chatsStore = useChatsStore()

onMounted(() => { // otherwise server always overrides with new session
  const session = chatsStore.hasSessions
    ? chatsStore.latestSession
    : chatsStore.newSession()
  navigateTo(chatsStore.sessionPath(session.id), { replace: true })
})
</script>

<template>
  <div />
</template>
