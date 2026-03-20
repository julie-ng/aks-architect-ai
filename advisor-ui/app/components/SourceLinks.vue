<script setup lang="ts">
import { shortenTitle } from '~/utils/citations'
import microsoftIcon from '~/assets/icons/microsoft.svg'

defineProps<{
  sources: Array<{ url: string, title?: string }>
}>()

function isMicrosoftSource (url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return hostname === 'learn.microsoft.com' || hostname === 'azure.microsoft.com'
  }
  catch {
    return false
  }
}
</script>

<template>
  <div v-if="sources.length" class="flex flex-wrap gap-1.5 mt-3">
    <a
      v-for="source in sources"
      :key="source.url"
      :href="source.url"
      target="_blank"
      rel="noopener"
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
    >
      <img
        v-if="isMicrosoftSource(source.url)"
        :src="microsoftIcon"
        alt=""
        class="w-3 h-3 shrink-0">
      <span class="truncate max-w-48">{{ shortenTitle(source.title || 'Source') }}</span>
      <UIcon name="i-lucide-external-link" class="w-3 h-3 shrink-0" />
    </a>
  </div>
</template>
