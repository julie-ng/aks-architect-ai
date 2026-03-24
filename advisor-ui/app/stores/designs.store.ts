import type { Design } from '~/types/design'
import { DesignRecord } from '~/utils/design-record'
import { defineStore } from 'pinia'

export const useDesignsStore = defineStore('designs', () => {
  const { loggedIn } = useUserSession()
  const requestFetch = useRequestFetch()

  const designs = ref<Record<string, Design>>({})
  const loaded = ref(false)

  // --- Internal callbacks for DesignRecord ---

  const _callbacks = {
    updateCache (id: string, data: Design) {
      designs.value = { ...designs.value, [id]: data }
    },
    removeFromCache (id: string) {
      // eslint-disable-next-line no-unused-vars
      const { [id]: _removed, ...rest } = designs.value
      designs.value = rest
    },
  }

  // --- Getters ---

  const sortedDesigns = computed(() =>
    Object.values(designs.value).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  )

  const hasDesigns = computed(() => sortedDesigns.value.length > 0)

  const getDesign = computed(() =>
    (id: string): Design | undefined => designs.value[id],
  )

  const getPathById = computed(() =>
    (id: string): string => `/designs/${id}`,
  )

  const getEditPathById = computed(() =>
    (id: string): string => `/designs/${id}/edit`,
  )

  // --- Record factories ---

  function getRecord (id: string): DesignRecord | undefined {
    const data = designs.value[id]
    if (!data) return undefined
    return new DesignRecord(data, _callbacks)
  }

  function newRecord (): DesignRecord {
    return new DesignRecord(null, _callbacks)
  }

  // --- Actions ---

  async function fetchDesigns (): Promise<void> {
    if (!loggedIn.value) return
    const data = await requestFetch<Array<{ id: string, title: string, description: string | null, createdAt: string, updatedAt: string }>>('/api/designs')
    const record: Record<string, Design> = {}
    for (const d of data) {
      record[d.id] = { ...d, requirements: {}, decisions: {} }
    }
    designs.value = record
    loaded.value = true
  }

  async function fetchDesign (id: string): Promise<Design> {
    const data = await requestFetch<Design>(`/api/designs/${id}`)
    designs.value = {
      ...designs.value,
      [id]: data,
    }
    return data
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

    // Record factories
    getRecord,
    newRecord,

    // Actions
    reset,
    fetchDesigns,
    fetchDesign,
  }
})
