<script setup lang="ts">
const props = defineProps<{
  decisions: Record<string, string | string[]>
}>()

const { data: componentEntries } = await useAsyncData('designer-components', () => {
  return queryCollection('components')
    .select('title', 'path', 'designer')
    .all()
})

const componentsLookup = computed(() => {
  const map: Record<string, { title: string, answers: Record<string, string> }> = {}
  for (const entry of componentEntries.value || []) {
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
  return componentsLookup.value[key]?.title || key
}

function resolveAnswer (key: string, value: string | string[]) {
  if (Array.isArray(value)) {
    return value.map(v => componentsLookup.value[key]?.answers[v] || v).join(', ')
  }
  return componentsLookup.value[key]?.answers[value] || value
}
</script>

<template>
  <div class="space-y-2">
    <h2 class="text-lg font-semibold">
      Decisions
    </h2>
    <section class="space-y-1">
      <DesignDecision
        v-for="(value, key) in props.decisions"
        :key="key"
        :question-title="resolveQuestion(String(key))"
        :answer-label="resolveAnswer(String(key), value)"
      />
    </section>
  </div>
</template>
