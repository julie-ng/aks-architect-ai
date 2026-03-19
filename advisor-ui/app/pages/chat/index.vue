<script setup lang="ts">
const { sortedSessions } = useChatSessionsStore()
const target = sortedSessions.length > 0
  ? `/chat/${sortedSessions[0].id}`
  : `/chat/${crypto.randomUUID()}`
navigateTo(target, { replace: true })
</script>

<template>
  <div />
</template>
