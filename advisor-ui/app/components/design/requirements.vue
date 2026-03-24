<script setup lang="ts">
const props = defineProps<{
  requirements: Record<string, string | string[]>
}>()

const { data: requirementEntries } = await useAsyncData('designer-requirements', () => {
  return queryCollection('requirements')
    .select('title', 'path', 'designer')
    .all()
})

const requirementsLookup = computed(() => {
  const map: Record<string, { title: string, answers: Record<string, string> }> = {}
  for (const entry of requirementEntries.value || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const designer = (entry as any)?.designer
    if (!designer) continue
    const key = entry.path.split('/').pop()
    if (!key) continue
    const answers: Record<string, string> = {}
    for (const answer of designer.answers || []) {
      answers[answer.key] = answer.label || answer.title || answer.key
    }
    map[key] = { title: designer.title || entry.title, answers }
  }
  return map
})

function resolveQuestion (key: string) {
  return requirementsLookup.value[key]?.title || key
}

function resolveAnswer (key: string, value: string | string[]) {
  if (Array.isArray(value)) {
    return value.map(v => requirementsLookup.value[key]?.answers[v] || v).join(', ')
  }
  return requirementsLookup.value[key]?.answers[value] || value
}
</script>

<template>
  <div class="space-y-2">
    <h2 class="text-lg font-semibold">
      Requirements
    </h2>
    <section class="space-y-1">
      <DesignRequirement
        v-for="(value, key) in props.requirements"
        :key="key"
        :question-title="resolveQuestion(String(key))"
        :answer-label="resolveAnswer(String(key), value)"
      />
    </section>
  </div>
</template>
