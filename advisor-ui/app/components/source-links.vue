<script setup lang="ts">
import microsoftIcon from '~/assets/icons/microsoft.svg'

const props = defineProps<{
  sources: Array<{ url: string, title?: string }>
}>()

const hasSources = computed(() => props.sources.length > 0)

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
  <div v-if="hasSources" class="mt-6 pt-2 border-t border-slate-200">
    <h3 class="my-4 font-semibold">References</h3>
    <div class="flex flex-wrap gap-2">
      <a
        v-for="source in sources"
        :key="source.url"
        :href="source.url"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1 px-2 py-2 rounded-md text-xs font-medium border border-slate-200 hover:bg-slate-100"
      >
        <img
          v-if="isMicrosoftSource(source.url)"
          :src="microsoftIcon"
          alt=""
          class="w-3 h-3 shrink-0">
        <span class="truncate max-w-72">{{ shortenCitationTitle(source.title || 'Source') }}</span>
        <UIcon name="i-lucide-external-link" class="w-3 h-3 shrink-0" />
      </a>
    </div>
  </div>
</template>
