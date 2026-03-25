<script setup lang="ts">
const props = defineProps<{
  decisions: Record<string, string | string[]>
}>()

const { lookup, resolveQuestion, resolveAnswer } = await useSpecLookup('components')
</script>

<template>
  <div class="space-y-2">
    <h2 class="text-lg font-semibold">
      Decisions
    </h2>
    <table class="w-full text-sm border-collapse border border-slate-200">
      <tbody>
        <tr
          v-for="(value, key) in props.decisions"
          :key="key"
          class="border-b border-slate-200 last:border-b-0"
        >
          <td class="px-4 py-3 font-medium w-1/2 border-r border-slate-200 align-top">{{ resolveQuestion(String(key)) }}</td>
          <td class="px-4 py-3 text-muted w-1/2 align-top">
            <div v-if="Array.isArray(value)" class="space-y-1">
              <div v-for="v in value" :key="v" class="flex items-center gap-1.5">
                <UIcon name="i-lucide-square-check" class="shrink-0" />
                {{ lookup[String(key)]?.answers[v] || v }}
              </div>
            </div>
            <div v-else class="flex items-center gap-1.5">
              <UIcon name="i-lucide-square-check" class="shrink-0" />
              {{ resolveAnswer(String(key), value) }}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
