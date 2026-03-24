import type { DesignData } from '~/models/Design'
import { defineStore } from 'pinia'

export const useDesignsStore = defineStore('designs', () => {
  const { loggedIn } = useUserSession()
  const requestFetch = useRequestFetch()

  const designs = ref<Record<string, DesignData>>({})
  const loaded = ref(false)

  // --- Getters ---

  const sortedDesigns = computed(() =>
    Object.values(designs.value).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  )

  const hasDesigns = computed(() => sortedDesigns.value.length > 0)

  const getDesign = computed(() =>
    (id: string): DesignData | undefined => designs.value[id],
  )

  const getPathById = computed(() =>
    (id: string): string => `/designs/${id}`,
  )

  const getEditPathById = computed(() =>
    (id: string): string => `/designs/${id}/edit`,
  )

  // --- Read actions ---

  async function fetchDesigns (): Promise<void> {
    if (!loggedIn.value) return
    const data = await requestFetch<Array<{ id: string, title: string, description: string | null, createdAt: string, updatedAt: string }>>('/api/designs')
    const record: Record<string, DesignData> = {}
    for (const d of data) {
      record[d.id] = { ...d, requirements: {}, decisions: {} }
    }
    designs.value = record
    loaded.value = true
  }

  async function fetchDesign (id: string): Promise<DesignData> {
    const data = await requestFetch<DesignData>(`/api/designs/${id}`)
    designs.value = { ...designs.value, [id]: data }
    return data
  }

  function get (id: string): DesignData | undefined {
    return designs.value[id]
  }

  // --- Write actions ---

  async function create (input: { title?: string, description?: string | null, decisions: Record<string, string | string[]>, requirements: Record<string, string | string[]> }): Promise<DesignData> {
    const data = await $fetch<DesignData>('/api/designs', {
      method: 'POST',
      body: input,
    })
    designs.value = { ...designs.value, [data.id]: data }
    return data
  }

  async function update (id: string, changes: Partial<DesignData>): Promise<DesignData> {
    await $fetch(`/api/designs/${id}`, {
      method: 'PATCH',
      body: changes,
    })
    const updated = { ...designs.value[id], ...changes, updatedAt: new Date().toISOString() }
    designs.value = { ...designs.value, [id]: updated }
    return updated
  }

  async function destroy (id: string): Promise<void> {
    await $fetch(`/api/designs/${id}`, { method: 'DELETE' })
    // eslint-disable-next-line no-unused-vars
    const { [id]: _removed, ...rest } = designs.value
    designs.value = rest
  }

  async function patchDecision (id: string, key: string, value: string | string[] | null): Promise<void> {
    await $fetch(`/api/designs/${id}/decisions`, {
      method: 'PATCH',
      body: { key, value },
    })
    const current = designs.value[id]
    if (current) {
      const decisions = { ...current.decisions }
      if (value === null) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete decisions[key]
      }
      else {
        decisions[key] = value
      }
      designs.value = { ...designs.value, [id]: { ...current, decisions } }
    }
  }

  async function patchRequirement (id: string, key: string, value: string | string[] | null): Promise<void> {
    await $fetch(`/api/designs/${id}/requirements`, {
      method: 'PATCH',
      body: { key, value },
    })
    const current = designs.value[id]
    if (current) {
      const requirements = { ...current.requirements }
      if (value === null) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete requirements[key]
      }
      else {
        requirements[key] = value
      }
      designs.value = { ...designs.value, [id]: { ...current, requirements } }
    }
  }

  async function fetchWafScores (decisions: Record<string, string | string[]>): Promise<Record<string, number>> {
    const { scores } = await $fetch<{ scores: Record<string, number> }>('/api/waf-scores', {
      method: 'POST',
      body: { decisions },
    })
    return scores
  }

  function reset () {
    designs.value = {}
    loaded.value = false
  }

  return {
    // State
    designs,
    loaded,

    // Getters
    sortedDesigns,
    hasDesigns,
    getDesign,
    getPathById,
    getEditPathById,

    // Read actions
    get,
    fetchDesigns,
    fetchDesign,

    // Write actions
    create,
    update,
    destroy,
    patchDecision,
    patchRequirement,
    fetchWafScores,

    // Reset
    reset,
  }
})
