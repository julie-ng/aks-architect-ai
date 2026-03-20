import { describe, it, expect } from 'vitest'
import { shortenTitle } from './shorten-title'

describe('shortenTitle', () => {
  it('strips " - Microsoft Learn" suffix', () => {
    expect(shortenTitle('AKS Networking - Microsoft Learn')).toBe('AKS Networking')
  })

  it('strips " | Microsoft Learn" suffix', () => {
    expect(shortenTitle('Core Concepts | Microsoft Learn')).toBe('Core Concepts')
  })

  it('strips " - Azure Architecture Center" suffix', () => {
    expect(shortenTitle('Baseline Architecture for an AKS Cluster - Azure Architecture Center'))
      .toBe('Baseline Architecture for an AKS Cluster')
  })

  it('replaces "Azure Kubernetes Service (AKS)" with "AKS"', () => {
    expect(shortenTitle('Azure Kubernetes Service (AKS) Core Concepts'))
      .toBe('AKS Core Concepts')
  })

  it('replaces standalone "Azure Kubernetes Service" with "AKS"', () => {
    expect(shortenTitle('Deploy Azure Kubernetes Service'))
      .toBe('Deploy AKS')
  })

  it('handles combined suffix and abbreviation', () => {
    expect(shortenTitle('Azure Kubernetes Service (AKS) Core Concepts - Microsoft Learn'))
      .toBe('AKS Core Concepts')
  })

  it('replaces "Azure Container Registry (ACR)" with "ACR"', () => {
    expect(shortenTitle('Azure Container Registry (ACR) Overview'))
      .toBe('ACR Overview')
  })

  it('replaces "Azure Key Vault" with "Key Vault"', () => {
    expect(shortenTitle('Azure Key Vault Secrets Provider'))
      .toBe('Key Vault Secrets Provider')
  })

  it('passes through short titles unchanged', () => {
    expect(shortenTitle('Network Policies')).toBe('Network Policies')
  })

  it('handles empty string', () => {
    expect(shortenTitle('')).toBe('')
  })

  it('trims whitespace', () => {
    expect(shortenTitle('  AKS Overview  ')).toBe('AKS Overview')
  })
})
