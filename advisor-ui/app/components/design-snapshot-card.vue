<script setup lang="ts">
import { humanizeSlug } from '~~/shared/utils/humanize-slug'

const props = defineProps<{
  title: string | null
  requirements: Record<string, string | string[]>
  decisions: Record<string, string | string[]>
}>()

const hasRequirements = computed(() => Object.keys(props.requirements).length > 0)
const hasDecisions = computed(() => Object.keys(props.decisions).length > 0)

function formatValue (val: string | string[]): string {
  return Array.isArray(val) ? val.map(v => humanizeSlug(v)).join(', ') : humanizeSlug(val)
}
</script>

<template>
  <UAlert
    color="info"
    variant="subtle"
    icon="i-lucide-clipboard-list"
    :title="title ?? 'Design Snapshot'"
    class="my-2"
  >
    <template #description>
      <div class="flex flex-col gap-3 mt-2 text-sm">
        <div v-if="hasRequirements">
          <p class="font-medium mb-1">
            Requirements
          </p>
          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <template
              v-for="(val, key) in requirements"
              :key="key"
            >
              <dt class="text-muted">
                {{ humanizeSlug(String(key)) }}
              </dt>
              <dd>{{ formatValue(val) }}</dd>
            </template>
          </dl>
        </div>
        <div v-if="hasDecisions">
          <p class="font-medium mb-1">
            Architectural Decisions
          </p>
          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <template
              v-for="(val, key) in decisions"
              :key="key"
            >
              <dt class="text-muted">
                {{ humanizeSlug(String(key)) }}
              </dt>
              <dd>{{ formatValue(val) }}</dd>
            </template>
          </dl>
        </div>
      </div>
    </template>
  </UAlert>
</template>
