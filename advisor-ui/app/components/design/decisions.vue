<script setup lang="ts">
const props = defineProps<{
  decisions: Record<string, string | string[]>
}>()

const route = useRoute()
const configurePath = route.path + '/configure?tab=decisions'
const schema = await useSpecSchema('components')
const answeredCount = Object.keys(props.decisions).length
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">
        Decisions
      </h2>
      <div class="text-sm text-muted">
        <span :class="textCountColor(answeredCount, schema.total)">{{ answeredCount }}/{{ schema.total }}</span> answered
      </div>
    </div>
    <p v-if="answeredCount === 0" class="text-sm text-muted">
      No decisions recorded yet. Go to the <NuxtLink :to="configurePath" class="text-primary hover:underline">configure page</NuxtLink> to answer the questions.
    </p>
    <table v-else class="w-full text-sm border-collapse border border-slate-200">
      <tbody>
        <tr
          v-for="(value, key) in props.decisions"
          :key="key"
          class="border-b border-slate-200 last:border-b-0"
        >
          <td class="px-4 py-3 font-medium w-1/2 border-r border-slate-200 align-top">{{ schema.getQuestionTitle(String(key)) }}</td>
          <td class="px-4 py-3 text-muted w-1/2 align-top">
            <div v-if="Array.isArray(value)" class="space-y-1">
              <div v-for="v in value" :key="v" class="flex items-center gap-1.5">
                <UIcon name="i-lucide-square-check" class="shrink-0" />
                {{ schema.getAnswerLabel(String(key), v) }}
              </div>
            </div>
            <div v-else class="flex items-center gap-1.5">
              <UIcon name="i-lucide-square-check" class="shrink-0" />
              {{ schema.getAnswerLabel(String(key), value) }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
