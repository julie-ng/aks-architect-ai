export interface DesignData {
  id: string
  title: string
  description: string | null
  requirements: Record<string, string | string[]>
  decisions: Record<string, string | string[]>
  createdAt: string
  updatedAt: string
}

export interface DesignPersistence {
  create: (input: { title?: string, description?: string | null, decisions: Record<string, string | string[]>, requirements: Record<string, string | string[]> }) => Promise<DesignData>
  update: (id: string, changes: Partial<DesignData>) => Promise<DesignData>
  destroy: (id: string) => Promise<void>
  patchDecision: (id: string, key: string, value: string | string[] | null) => Promise<void>
  patchRequirement: (id: string, key: string, value: string | string[] | null) => Promise<void>
}

export class Design {
  private _data: DesignData | null
  private _snapshot: { title: string, description: string | null }
  private _persist: DesignPersistence
  private _saving = false

  constructor (data: DesignData | null, persist: DesignPersistence) {
    this._data = data ? { ...data } : null
    this._persist = persist
    this._snapshot = {
      title: data?.title ?? '',
      description: data?.description ?? null,
    }
  }

  // --- Read-only getters ---

  get id (): string | null {
    return this._data?.id || null
  }
  get title (): string {
    return this._data?.title ?? ''
  }
  get description (): string | null {
    return this._data?.description ?? null
  }
  get decisions (): Record<string, string | string[]> {
    return this._data?.decisions ?? {}
  }
  get requirements (): Record<string, string | string[]> {
    return this._data?.requirements ?? {}
  }
  get createdAt (): string | null {
    return this._data?.createdAt ?? null
  }
  get updatedAt (): string | null {
    return this._data?.updatedAt ?? null
  }
  get saving (): boolean {
    return this._saving
  }

  // --- Derived paths ---

  get path (): string | null {
    return this.id ? `/designs/${this.id}` : null
  }

  get configurePath (): string | null {
    return this.id ? `/designs/${this.id}/configure` : null
  }

  // --- Setters (mark dirty) ---

  set title (v: string) {
    if (!this._data) this._data = this._emptyData()
    this._data.title = v
  }

  set description (v: string | null) {
    if (!this._data) this._data = this._emptyData()
    this._data.description = v
  }

  // --- Derived ---

  get isDirty (): boolean {
    return this.title !== this._snapshot.title
      || this.description !== this._snapshot.description
  }

  get isNew (): boolean {
    return this.id === null
  }

  get hasBeenConfigured (): boolean {
    return Object.keys(this.decisions).length > 0 || Object.keys(this.requirements).length > 0
  }

  // --- Persistence (delegates to injected callbacks) ---

  async save (): Promise<void> {
    this._saving = true
    try {
      if (this.isNew) {
        const created = await this._persist.create({
          title: this.title || undefined,
          description: this.description || undefined,
          decisions: this.decisions,
          requirements: this.requirements,
        })
        this._data = { ...created }
        this._snapshot = { title: created.title, description: created.description }
      }
      else if (this.isDirty) {
        const changes: Partial<DesignData> = {}
        if (this.title !== this._snapshot.title) changes.title = this.title
        if (this.description !== this._snapshot.description) changes.description = this.description
        const updated = await this._persist.update(this.id!, changes)
        this._data = { ...updated }
        this._snapshot = { title: updated.title, description: updated.description }
      }
    }
    finally {
      this._saving = false
    }
  }

  async resetDecision (key: string): Promise<void> {
    await this.setDecision(key, null)
  }

  async resetAllDecisions (): Promise<void> {
    for (const key of Object.keys(this.decisions)) {
      await this.setDecision(key, null)
    }
  }

  async resetRequirement (key: string): Promise<void> {
    await this.setRequirement(key, null)
  }

  async resetAllRequirements (): Promise<void> {
    for (const key of Object.keys(this.requirements)) {
      await this.setRequirement(key, null)
    }
  }

  async setDecision (key: string, value: string | string[] | null): Promise<void> {
    if (!this._data) return
    const updated = { ...this._data.decisions }
    if (value === null) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete updated[key]
    }
    else {
      updated[key] = value
    }
    this._data = { ...this._data, decisions: updated }

    if (!this.isNew) {
      await this._persist.patchDecision(this.id!, key, value)
    }
  }

  async setRequirement (key: string, value: string | string[] | null): Promise<void> {
    if (!this._data) return
    const updated = { ...this._data.requirements }
    if (value === null) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete updated[key]
    }
    else {
      updated[key] = value
    }
    this._data = { ...this._data, requirements: updated }

    if (!this.isNew) {
      await this._persist.patchRequirement(this.id!, key, value)
    }
  }

  async delete (): Promise<void> {
    if (this.isNew) return
    await this._persist.destroy(this.id!)
  }

  static from (data: DesignData, persist: DesignPersistence): Design {
    return new Design(data, persist)
  }

  private _emptyData (): DesignData {
    return {
      id: '',
      title: '',
      description: null,
      requirements: {},
      decisions: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
}
