<script setup lang="ts">
const props = defineProps<{
  requirements: Record<string, string | string[]>
}>()

const schema = await useRequirementsSchema()

/**
 * Decisions Format from Database is in key: value format.
 *
{
    "tenancy": "single-tenant",
    "team-role": "app-developer",
    "organization-type": "startup",
    "networking-boundary": "public",
    "infrastructure-experience": "medium"
}
 */
</script>

<template>
  <div class="space-y-2">
    <h2 class="text-lg font-semibold">
      Requirements
    </h2>
    <table class="w-full text-sm border-collapse border border-slate-200">
      <tbody>
        <tr
          v-for="(val, key) in props.requirements"
          :key="key"
          class="border-b border-slate-200 last:border-b-0"
        >
          <td class="px-4 py-3 font-medium w-1/2 border-r border-slate-200">
            {{ schema.getQuestionShortTitle(key) }}
          </td>
          <td class="px-4 py-3 text-muted w-1/2">
            {{ schema.getAnswerLabel(key, val)  }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
