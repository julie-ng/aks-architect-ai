<script setup lang="ts">
import { humanizeSlug } from '~~/shared/utils/humanize-slug'

const props = defineProps<{
  designId?: string
  title: string | null
  requirements?: Record<string, string | string[]>
  decisions?: Record<string, string | string[]>
}>()

const hasRequirements = computed(() => Object.keys(props.requirements ?? {}).length > 0)
const hasDecisions = computed(() => Object.keys(props.decisions ?? {}).length > 0)

// function formatValue (val: string | string[]): string {
//   return Array.isArray(val) ? val.map(v => humanizeSlug(v)).join(', ') : humanizeSlug(val)
// }
</script>

<template>
  <div class="p-6">
    <!-- <pre class="text-xs text-default bg-slate-100 rounded-lg p-3 overflow-x-auto"><code>{{ JSON.stringify(data, null, 2) }}</code></pre> -->
    <div class="flex items-baseline justify-between mt-1 mb-3">
      <h1 class="text-slate-700 text-sm font-semibold">{{ title }}</h1>
      <p class="text-slate-400 text-xs">Id: {{ designId }}</p>
    </div>

    <!-- Business Requirements -->
    <div v-if="hasRequirements">
      <p class="font-medium mt-1 mb-2 text-slate-800">Requirements</p>
      <table class="border-collapse border border-slate-400 w-full">
        <tbody>
          <template v-for="(val, key) in requirements" :key="key">
            <tr>
              <td class="border border-slate-200 py-1 px-3 text-slate-500 w-1/2">
                {{ humanizeSlug(String(key)) }}
              </td>
              <td class="border border-slate-200 py-1 px-3 text-slate-700">
                <ul v-if="Array.isArray(val)" class="list-disc ps-4">
                  <li v-for="item in val" :key="item">{{ humanizeSlug(item) }}</li>
                </ul>
                <span v-else>{{ humanizeSlug(val) }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Architectural Decisions -->
    <div v-if="hasDecisions">
      <p class="font-medium mt-4 mb-2 text-slate-800">Architectural Decisions</p>
      <table class="border-collapse border border-slate-400 w-full">
        <tbody>
          <template v-for="(val, key) in decisions" :key="key">
            <tr>
              <td class="border border-slate-200 py-1 px-3 text-slate-500 w-1/2">
                {{ humanizeSlug(String(key)) }}
              </td>
              <td class="border border-slate-200 py-1 px-3 text-slate-700">
                <ul v-if="Array.isArray(val)" class="list-disc ps-4">
                  <li v-for="item in val" :key="item" class="list-circle">{{ humanizeSlug(item) }}</li>
                </ul>
                <span v-else>{{ humanizeSlug(val) }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style>
.list-circle {
  list-style-type: circle;
}
</style>
