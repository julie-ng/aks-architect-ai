<script setup lang="ts">
const props = defineProps<{
  designId: string
}>()

const designsStore = useDesignsStore()
await callOnce(`design-${props.designId}`, () => designsStore.fetchDesign(props.designId))

const design = computed(() => designsStore.get(props.designId))
const requirements = computed(() => design.value?.requirements ?? {})
const configurePath = designsStore.getConfigurePath(props.designId)
const schema = await useSpecSchema('requirements')
const answeredCount = computed(() => Object.keys(requirements.value).length)
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">
        Requirements
      </h2>
      <div class="text-sm text-muted">
        <span :class="textCountColor(answeredCount, schema.total)">{{ answeredCount }}/{{ schema.total }}</span> answered
      </div>
    </div>
    <p v-if="answeredCount === 0" class="text-sm text-muted">
      No requirements recorded yet. Go to the <NuxtLink :to="configurePath" class="text-primary hover:underline">configure page</NuxtLink> to answer the questions.
    </p>
    <table v-else class="w-full text-sm border-collapse border border-slate-200">
      <tbody>
        <tr
          v-for="(val, key) in requirements"
          :key="key"
          class="border-b border-slate-200 last:border-b-0"
        >
          <td class="px-4 py-3 font-medium w-1/2 border-r border-slate-200">
            {{ schema.getQuestionTitle(key) }}
          </td>
          <td class="px-4 py-3 text-muted w-1/2">
            {{ schema.getAnswerLabel(key, val) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
