<script setup lang="ts">
const chatsStore = useChatsStore()

onMounted(async () => {
  const session = await chatsStore.newSession()
  navigateTo(chatsStore.sessionPath(session.id), { replace: true })
})
</script>

<template>
  <div />
</template>
