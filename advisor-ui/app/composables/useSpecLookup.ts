type CollectionName = 'components' | 'requirements'

type LookupEntry = {
  title: string
  shortTitle: string | undefined
  answers: Record<string, string>
}

export async function useSpecLookup (collection: CollectionName) {
  const { data: entries } = await useAsyncData(`spec-${collection}`, () => {
    return queryCollection(collection)
      .select('title', 'stem', 'spec')
      .all()
  })

  const lookup = computed(() => {
    const map: Record<string, LookupEntry> = {}
    for (const entry of entries.value || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = entry as any
      const spec = e?.spec
      if (!spec || !e.stem) continue
      const answers: Record<string, string> = {}
      for (const answer of spec.answers || []) {
        answers[answer.key] = answer.label || answer.title || answer.key
      }
      map[e.stem] = {
        title: spec.title || e.title,
        shortTitle: spec.short_title,
        answers,
      }
    }
    return map
  })

  function resolveQuestion (key: string): string {
    const entry = lookup.value[key]
    return entry?.shortTitle || entry?.title || key
  }

  function resolveAnswer (key: string, value: string | string[]): string {
    if (Array.isArray(value)) {
      return value.map(v => lookup.value[key]?.answers[v] || v).join(', ')
    }
    return lookup.value[key]?.answers[value] || value
  }

  return { lookup, resolveQuestion, resolveAnswer }
}
