import { describe, it, expect } from 'vitest'
import { selectDomains } from './select-domains'

describe('selectDomains', () => {
  it('always includes cluster-design', () => {
    const result = selectDomains('hello world')
    expect(result).toContain('cluster-design')
  })

  it('matches networking keywords', () => {
    const result = selectDomains('How should I configure my ingress controller?')
    expect(result).toContain('networking')
    expect(result).toContain('cluster-design')
  })

  it('matches security keywords', () => {
    const result = selectDomains('How do I set up workload identity for my pods?')
    expect(result).toContain('security')
  })

  it('matches operations keywords', () => {
    const result = selectDomains('What is the best upgrade strategy for AKS?')
    expect(result).toContain('operations')
  })

  it('matches observability-and-cost keywords', () => {
    const result = selectDomains('How can I reduce cost with spot node pools?')
    expect(result).toContain('observability-and-cost')
  })

  it('matches resilience keywords', () => {
    const result = selectDomains('Should I set up multi-region disaster recovery?')
    expect(result).toContain('resilience')
  })

  it('matches scalability-and-storage keywords', () => {
    const result = selectDomains('How do I configure HPA for autoscaling?')
    expect(result).toContain('scalability-and-storage')
  })

  it('matches multiple domains when question spans topics', () => {
    const result = selectDomains('I need ingress with RBAC and monitoring')
    expect(result).toContain('networking')
    expect(result).toContain('security')
    expect(result).toContain('observability-and-cost')
  })

  it('is case insensitive', () => {
    const result = selectDomains('How does KEDA work with VPA?')
    expect(result).toContain('scalability-and-storage')
  })

  it('returns only cluster-design for generic questions', () => {
    const result = selectDomains('What is AKS?')
    expect(result).toEqual(['cluster-design'])
  })
})
