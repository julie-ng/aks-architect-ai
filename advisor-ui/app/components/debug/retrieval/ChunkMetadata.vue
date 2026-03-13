<script setup lang="ts">
defineProps<{
  tags: Record<string, string | string[]>
  priority: number | null
}>()
</script>

<template>
  <div class="mb-6">
    <!-- <h3 class="my-2 text-sm text-toned font-medium">Metadata</h3> -->
    <div class="space-y-2 text-xs">
      <div v-if="priority != null">
        <div class="text-muted">Priority</div>
        <div class="font-mono">{{ priority }}</div>
      </div>
      <div v-for="(value, key) in tags" :key="String(key)">
        <div class="text-muted mb-1">{{ key }}</div>
        <div v-if="Array.isArray(value)" class="flex flex-wrap gap-1 mb-4">
          <UBadge
            v-for="tag in value"
            :key="tag"
            variant="soft"
            color="neutral"
            size="sm"
          >{{ tag }}</UBadge>
        </div>
        <div v-else class="font-mono mb-4">{{ value }}</div>
      </div>
    </div>
  </div>
</template>
