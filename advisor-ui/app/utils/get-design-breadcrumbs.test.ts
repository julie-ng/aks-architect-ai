import { describe, it, expect } from 'vitest'
import getDesignBreadcrumbs from './get-design-breadcrumbs'

describe('getDesignBreadcrumbs', () => {
  it('returns only Designs root when no design and no action', () => {
    expect(getDesignBreadcrumbs(null)).toEqual([
      { label: 'Designs', to: '/designs' },
    ])
  })

  it('returns Designs > title for a design without action', () => {
    expect(getDesignBreadcrumbs({ title: 'My Cluster', id: 'abc-123' })).toEqual([
      { label: 'Designs', to: '/designs' },
      { label: 'My Cluster' },
    ])
  })

  it('returns Designs > title (linked) > action for a design with action', () => {
    expect(getDesignBreadcrumbs({ title: 'My Cluster', id: 'abc-123' }, { action: 'Edit' })).toEqual([
      { label: 'Designs', to: '/designs' },
      { label: 'My Cluster', to: '/designs/abc-123' },
      { label: 'Edit' },
    ])
  })

  it('returns Designs > action when no design but action given', () => {
    expect(getDesignBreadcrumbs(null, { action: 'New' })).toEqual([
      { label: 'Designs', to: '/designs' },
      { label: 'New' },
    ])
  })
})
