import { describe, it, expect, vi } from 'vitest'
import { Design } from './Design'
import type { DesignData, DesignPersistence } from './Design'

function mockData (overrides?: Partial<DesignData>): DesignData {
  return {
    id: 'design-1',
    title: 'My Design',
    description: 'A test design',
    requirements: {},
    decisions: { networking: 'hub-spoke' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mockPersist (overrides?: Partial<DesignPersistence>): DesignPersistence {
  return {
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    patchDecision: vi.fn(),
    patchRequirement: vi.fn(),
    ...overrides,
  }
}

describe('Design', () => {
  describe('constructor', () => {
    it('initializes from data', () => {
      const design = new Design(mockData(), mockPersist())
      expect(design.id).toBe('design-1')
      expect(design.title).toBe('My Design')
      expect(design.description).toBe('A test design')
      expect(design.decisions).toEqual({ networking: 'hub-spoke' })
    })

    it('initializes as new when data is null', () => {
      const design = new Design(null, mockPersist())
      expect(design.id).toBeNull()
      expect(design.title).toBe('')
      expect(design.isNew).toBe(true)
    })
  })

  describe('dirty tracking', () => {
    it('is not dirty after construction', () => {
      const design = new Design(mockData(), mockPersist())
      expect(design.isDirty).toBe(false)
    })

    it('is dirty after changing title', () => {
      const design = new Design(mockData(), mockPersist())
      design.title = 'Updated Title'
      expect(design.isDirty).toBe(true)
      expect(design.title).toBe('Updated Title')
    })

    it('is dirty after changing description', () => {
      const design = new Design(mockData(), mockPersist())
      design.description = 'New description'
      expect(design.isDirty).toBe(true)
    })

    it('is not dirty when set back to original value', () => {
      const design = new Design(mockData(), mockPersist())
      design.title = 'Changed'
      design.title = 'My Design'
      expect(design.isDirty).toBe(false)
    })
  })

  describe('save()', () => {
    it('calls create for new designs', async () => {
      const created = mockData({ id: 'new-id', title: 'New' })
      const persist = mockPersist({ create: vi.fn().mockResolvedValue(created) })
      const design = new Design(null, persist)
      design.title = 'New'

      await design.save()

      expect(persist.create).toHaveBeenCalledWith({
        title: 'New',
        description: undefined,
        decisions: {},
        requirements: {},
      })
      expect(design.id).toBe('new-id')
      expect(design.isDirty).toBe(false)
    })

    it('calls update for dirty existing designs', async () => {
      const data = mockData()
      const updated = { ...data, title: 'Updated' }
      const persist = mockPersist({ update: vi.fn().mockResolvedValue(updated) })
      const design = new Design(data, persist)
      design.title = 'Updated'

      await design.save()

      expect(persist.update).toHaveBeenCalledWith('design-1', { title: 'Updated' })
      expect(design.isDirty).toBe(false)
    })

    it('does nothing for clean existing designs', async () => {
      const persist = mockPersist()
      const design = new Design(mockData(), persist)

      await design.save()

      expect(persist.create).not.toHaveBeenCalled()
      expect(persist.update).not.toHaveBeenCalled()
    })

    it('sets saving flag during save', async () => {
      let resolveSave!: (v: DesignData) => void
      const persist = mockPersist({
        create: vi.fn().mockReturnValue(new Promise(r => { resolveSave = r })),
      })
      const design = new Design(null, persist)
      design.title = 'Test'

      const promise = design.save()
      expect(design.saving).toBe(true)

      resolveSave(mockData({ id: 'new-id', title: 'Test' }))
      await promise
      expect(design.saving).toBe(false)
    })
  })

  describe('setDecision()', () => {
    it('updates decisions locally', async () => {
      const persist = mockPersist({ patchDecision: vi.fn().mockResolvedValue(undefined) })
      const design = new Design(mockData(), persist)

      await design.setDecision('compute', 'vm-scale-set')

      expect(design.decisions).toEqual({ networking: 'hub-spoke', compute: 'vm-scale-set' })
    })

    it('calls patchDecision for persisted designs', async () => {
      const persist = mockPersist({ patchDecision: vi.fn().mockResolvedValue(undefined) })
      const design = new Design(mockData(), persist)

      await design.setDecision('compute', 'vm-scale-set')

      expect(persist.patchDecision).toHaveBeenCalledWith('design-1', 'compute', 'vm-scale-set')
    })

    it('does not call patchDecision for new designs', async () => {
      const persist = mockPersist()
      const design = new Design(null, persist)
      design.title = 'New'

      await design.setDecision('compute', 'vm-scale-set')

      expect(persist.patchDecision).not.toHaveBeenCalled()
    })

    it('removes a decision when value is null', async () => {
      const persist = mockPersist({ patchDecision: vi.fn().mockResolvedValue(undefined) })
      const design = new Design(mockData(), persist)

      await design.setDecision('networking', null)

      expect(design.decisions).toEqual({})
    })
  })

  describe('setRequirement()', () => {
    it('updates requirements locally and calls persist', async () => {
      const persist = mockPersist({ patchRequirement: vi.fn().mockResolvedValue(undefined) })
      const design = new Design(mockData(), persist)

      await design.setRequirement('tenancy', 'multi-tenant')

      expect(design.requirements).toEqual({ tenancy: 'multi-tenant' })
      expect(persist.patchRequirement).toHaveBeenCalledWith('design-1', 'tenancy', 'multi-tenant')
    })
  })

  describe('delete()', () => {
    it('calls destroy for persisted designs', async () => {
      const persist = mockPersist({ destroy: vi.fn().mockResolvedValue(undefined) })
      const design = new Design(mockData(), persist)

      await design.delete()

      expect(persist.destroy).toHaveBeenCalledWith('design-1')
    })

    it('does nothing for new designs', async () => {
      const persist = mockPersist()
      const design = new Design(null, persist)

      await design.delete()

      expect(persist.destroy).not.toHaveBeenCalled()
    })
  })

  describe('static from()', () => {
    it('creates an instance from data', () => {
      const design = Design.from(mockData(), mockPersist())
      expect(design).toBeInstanceOf(Design)
      expect(design.id).toBe('design-1')
    })
  })
})
