import { describe, it, expect } from 'vitest'
import { shortenCitationTitle } from './shorten-citation-title'

describe('shortenCitationTitle', () => {
  it('strips " - Microsoft Learn" suffix', () => {
    expect(shortenCitationTitle('AKS Networking - Microsoft Learn')).toBe('AKS Networking')
  })

  it('strips " | Microsoft Learn" suffix', () => {
    expect(shortenCitationTitle('Core Concepts | Microsoft Learn')).toBe('Core Concepts')
  })

  it('strips " - Azure Architecture Center" suffix', () => {
    expect(shortenCitationTitle('Baseline Architecture for an AKS Cluster - Azure Architecture Center'))
      .toBe('Baseline Architecture for an AKS Cluster')
  })

  it('replaces "Azure Kubernetes Service (AKS)" with "AKS"', () => {
    expect(shortenCitationTitle('Azure Kubernetes Service (AKS) Core Concepts'))
      .toBe('AKS Core Concepts')
  })

  it('replaces standalone "Azure Kubernetes Service" with "AKS"', () => {
    expect(shortenCitationTitle('Deploy Azure Kubernetes Service'))
      .toBe('Deploy AKS')
  })

  it('handles combined suffix and abbreviation', () => {
    expect(shortenCitationTitle('Azure Kubernetes Service (AKS) Core Concepts - Microsoft Learn'))
      .toBe('AKS Core Concepts')
  })

  it('replaces "Azure Container Registry (ACR)" with "ACR"', () => {
    expect(shortenCitationTitle('Azure Container Registry (ACR) Overview'))
      .toBe('ACR Overview')
  })

  it('replaces "Azure Key Vault" with "Key Vault"', () => {
    expect(shortenCitationTitle('Azure Key Vault Secrets Provider'))
      .toBe('Key Vault Secrets Provider')
  })

  it('passes through short titles unchanged', () => {
    expect(shortenCitationTitle('Network Policies')).toBe('Network Policies')
  })

  it('handles empty string', () => {
    expect(shortenCitationTitle('')).toBe('')
  })

  it('trims whitespace', () => {
    expect(shortenCitationTitle('  AKS Overview  ')).toBe('AKS Overview')
  })
})
