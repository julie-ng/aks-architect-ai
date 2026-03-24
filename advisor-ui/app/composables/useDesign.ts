import { Design } from '~/models/Design'
import type { DesignPersistence } from '~/models/Design'

export function useDesign (id: string) {
  const store = useDesignsStore()

  const persist: DesignPersistence = {
    create: input => store.create(input),
    update: (id, changes) => store.update(id, changes),
    destroy: id => store.destroy(id),
    patchDecision: (id, key, value) => store.patchDecision(id, key, value),
    patchRequirement: (id, key, value) => store.patchRequirement(id, key, value),
  }

  const design = computed(() => {
    const raw = store.get(id)
    return raw ? Design.from(raw, persist) : null
  })

  return { design }
}
