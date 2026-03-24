import type { Design } from '~/types/design'

type StoreCallbacks = {
  updateCache: (id: string, data: Design) => void
  removeFromCache: (id: string) => void
}

export class DesignRecord {
  id = ref<string | null>(null)
  title = ref('')
  description = ref<string | null>(null)
  decisions = ref<Record<string, string | string[]>>({})
  requirements = ref<Record<string, string | string[]>>({})
  wafScores = ref<Record<string, number>>({})
  saving = ref(false)

  private _snapshot: { title: string, description: string | null }
  private _callbacks: StoreCallbacks

  constructor (data: Design | null, callbacks: StoreCallbacks) {
    this._callbacks = callbacks

    if (data) {
      this.id.value = data.id
      this.title.value = data.title
      this.description.value = data.description
      this.decisions.value = { ...data.decisions }
      this.requirements.value = { ...data.requirements }
    }

    this._snapshot = {
      title: this.title.value,
      description: this.description.value,
    }
  }

  get isDirty (): boolean {
    return this.title.value !== this._snapshot.title
      || this.description.value !== this._snapshot.description
  }

  get isNew (): boolean {
    return this.id.value === null
  }

  async save (): Promise<void> {
    this.saving.value = true
    try {
      if (this.isNew) {
        await this._create()
      }
      else if (this.isDirty) {
        await this._update()
      }
    }
    finally {
      this.saving.value = false
    }
  }

  async setDecision (key: string, value: string | string[] | null): Promise<void> {
    const updated = { ...this.decisions.value }
    if (value === null) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete updated[key]
    }
    else {
      updated[key] = value
    }
    this.decisions.value = updated

    if (!this.isNew) {
      await $fetch(`/api/designs/${this.id.value}/decisions`, {
        method: 'PATCH',
        body: { key, value },
      })
      this._syncToStore()
    }

    this.fetchWafScores()
  }

  async setRequirement (key: string, value: string | string[] | null): Promise<void> {
    const updated = { ...this.requirements.value }
    if (value === null) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete updated[key]
    }
    else {
      updated[key] = value
    }
    this.requirements.value = updated

    if (!this.isNew) {
      await $fetch(`/api/designs/${this.id.value}/requirements`, {
        method: 'PATCH',
        body: { key, value },
      })
      this._syncToStore()
    }
  }

  async fetchWafScores (): Promise<void> {
    const { scores } = await $fetch<{ scores: Record<string, number> }>('/api/waf-scores', {
      method: 'POST',
      body: { decisions: this.decisions.value }
    })
    this.wafScores.value = scores
  }

  async delete (): Promise<void> {
    if (this.isNew) return
    const id = this.id.value!
    await $fetch(`/api/designs/${id}`, { method: 'DELETE' })
    this._callbacks.removeFromCache(id)
  }

  private async _create (): Promise<void> {
    const data = await $fetch<Design>('/api/designs', {
      method: 'POST',
      body: {
        title: this.title.value || undefined,
        description: this.description.value || undefined,
        decisions: this.decisions.value,
        requirements: this.requirements.value,
      },
    })
    this.id.value = data.id
    this._snapshot = { title: data.title, description: data.description }
    this._callbacks.updateCache(data.id, data)
  }

  private async _update (): Promise<void> {
    const id = this.id.value!
    const updates: Record<string, unknown> = {}
    if (this.title.value !== this._snapshot.title) updates.title = this.title.value
    if (this.description.value !== this._snapshot.description) updates.description = this.description.value

    await $fetch(`/api/designs/${id}`, {
      method: 'PATCH',
      body: updates,
    })
    this._snapshot = { title: this.title.value, description: this.description.value }
    this._syncToStore()
  }

  private _syncToStore (): void {
    if (this.isNew) return
    this._callbacks.updateCache(this.id.value!, this._toDesign())
  }

  private _toDesign (): Design {
    return {
      id: this.id.value!,
      title: this.title.value,
      description: this.description.value,
      decisions: { ...this.decisions.value },
      requirements: { ...this.requirements.value },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
}
