import { describe, it, expect } from 'vitest'
import { formatDesignContext } from './format-design-context'

describe('formatDesignContext', () => {
  it('formats requirements as humanized key-value pairs', () => {
    const result = formatDesignContext(
      { 'organization-type': 'enterprise', 'compliance-frameworks': ['pci-dss', 'hipaa'] },
      {},
    )
    expect(result).toBe(
      'Requirements:\n'
      + '- Organization Type: Enterprise\n'
      + '- Compliance Frameworks: Pci Dss, Hipaa',
    )
  })

  it('formats decisions as humanized key-value pairs', () => {
    const result = formatDesignContext(
      {},
      { 'network-model': 'azure-cni-overlay', 'ingress-controller': 'nginx' },
    )
    expect(result).toBe(
      'Architectural Decisions:\n'
      + '- Network Model: Azure Cni Overlay\n'
      + '- Ingress Controller: Nginx',
    )
  })

  it('formats both sections separated by double newline', () => {
    const result = formatDesignContext(
      { 'organization-type': 'startup' },
      { 'network-model': 'kubenet' },
    )
    expect(result).toContain('Requirements:\n- Organization Type: Startup')
    expect(result).toContain('\n\nArchitectural Decisions:\n- Network Model: Kubenet')
  })

  it('returns empty string when both are empty', () => {
    expect(formatDesignContext({}, {})).toBe('')
  })

  it('omits requirements section when empty', () => {
    const result = formatDesignContext({}, { 'network-model': 'kubenet' })
    expect(result).not.toContain('Requirements:')
    expect(result).toContain('Architectural Decisions:')
  })

  it('omits decisions section when empty', () => {
    const result = formatDesignContext({ 'organization-type': 'enterprise' }, {})
    expect(result).toContain('Requirements:')
    expect(result).not.toContain('Architectural Decisions:')
  })

  it('handles single string values', () => {
    const result = formatDesignContext({ 'cluster-tier': 'free' }, {})
    expect(result).toContain('- Cluster Tier: Free')
  })
})
