<script setup>
const route = useRoute()
const { data: page } = await useAsyncData(route.path, () => {
  return queryCollection('guide').path(route.path).first()
}, { watch: [() => route.path] })

const { data: surround } = await useAsyncData(`${route.path}-surround`, () => {
  return queryCollectionItemSurroundings('guide', route.path, {
      fields: ['description']
    })
}, { watch: [() => route.path] })

const breadcrumbItems = computed(() => [
  { label: 'Guide', to: '/guide', ui: { link: 'text-dimmed' } },
  { label: page.value?.title, ui: { link: 'text-muted' } },
])

useSeoMeta({
  title: page.value?.title,
  description: page.value?.description
})

definePageMeta({
  layout: 'guide',
})
</script>

<template>
  <main class="flex gap-8">
    <div class="w-3/4 min-w-0">
      <UBreadcrumb :items="breadcrumbItems" class="my-6" :ui="{ separator: 'opacity-35', link: 'text-dimmed' }"/>

      <ContentRenderer v-if="page" :value="page" />
      <div v-else>Page not found</div>

      <nav class="mt-10 mb-12 pt-3 border-t border-default grid grid-cols-2 divide-x divide-default">
        <NuxtLink v-if="surround?.[0]" :to="surround[0].path" class="flex items-start gap-3 pt-4 hover:text-primary transition-colors">
          <UIcon name="i-lucide-chevron-left" class="mt-0.5 size-5 shrink-0" />
          <div>
            <p class="font-semibold">{{ surround[0].title }}</p>
            <p v-if="surround[0].description" class="text-sm text-muted mt-1">{{ surround[0].description }}</p>
          </div>
        </NuxtLink>
        <div v-else />
        <NuxtLink v-if="surround?.[1]" :to="surround[1].path" class="flex items-start gap-3 pt-4 pl-4 text-right hover:text-primary transition-colors">
          <div class="flex-1">
            <p class="font-semibold">{{ surround[1].title }}</p>
            <p v-if="surround[1].description" class="text-sm text-muted mt-1">{{ surround[1].description }}</p>
          </div>
          <UIcon name="i-lucide-chevron-right" class="mt-1 size-5 shrink-0" />
        </NuxtLink>
      </nav>
    </div>

    <div class="w-1/4">
      <UContentToc
        :links="page?.body?.toc?.links"
        title="On this page"
        :ui="{ root: 'bg-default backdrop-blur-none' }"
        highlight
      />
    </div>
  </main>
</template>
