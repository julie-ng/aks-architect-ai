import { describe, it, expect } from 'vitest';
import { matchSource } from './match-source.js';
import { type Source } from '../types.js';

const aksDocs: Source = {
  name: 'aks-docs',
  description: 'Official AKS docs',
  seed_urls: ['https://learn.microsoft.com/en-us/azure/aks/'],
  allowed_globs: ['https://learn.microsoft.com/en-us/azure/aks/**'],
  priority: 20,
  tags: { source_category: 'aks-docs' },
};

const pciRegulated: Source = {
  name: 'aks-pci-regulated',
  description: 'PCI DSS regulated cluster docs',
  seed_urls: ['https://learn.microsoft.com/en-us/azure/aks/pci-intro'],
  allowed_globs: ['https://learn.microsoft.com/en-us/azure/aks/pci-**'],
  priority: 10,
  tags: { source_category: 'aks-docs', scenario_tags: ['regulated', 'pci-dss'] },
};

const cafLandingZone: Source = {
  name: 'caf-landing-zone',
  description: 'CAF Landing Zone',
  seed_urls: ['https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/scenarios/app-platform/aks/landing-zone-accelerator'],
  allowed_globs: ['https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/scenarios/app-platform/aks/**'],
  tags: { source_category: 'caf', doc_type: 'landing-zone' },
};

const allSources = [aksDocs, pciRegulated, cafLandingZone];

describe('matchSource', () => {
  it('matches a URL to the correct source by glob prefix', () => {
    const result = matchSource(
      'https://learn.microsoft.com/en-us/azure/aks/concepts-networking',
      allSources,
    );
    expect(result?.name).toBe('aks-docs');
    expect(result?.tags.source_category).toBe('aks-docs');
  });

  it('prefers the most specific (longest prefix) match', () => {
    // pci-intro matches both aks-docs (/azure/aks/**) and aks-pci-regulated (/azure/aks/pci-**)
    // The PCI glob has a longer fixed prefix, so it should win
    const result = matchSource(
      'https://learn.microsoft.com/en-us/azure/aks/pci-network-requirements',
      allSources,
    );
    expect(result?.name).toBe('aks-pci-regulated');
    expect(result?.tags.scenario_tags).toEqual(['regulated', 'pci-dss']);
  });

  it('matches CAF landing zone URLs', () => {
    const result = matchSource(
      'https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/scenarios/app-platform/aks/security',
      allSources,
    );
    expect(result?.name).toBe('caf-landing-zone');
    expect(result?.tags.doc_type).toBe('landing-zone');
  });

  it('returns null when no source matches the URL', () => {
    const result = matchSource(
      'https://learn.microsoft.com/en-us/azure/virtual-machines/overview',
      allSources,
    );
    expect(result).toBeNull();
  });

  it('returns the priority from the matched source', () => {
    const result = matchSource(
      'https://learn.microsoft.com/en-us/azure/aks/concepts-networking',
      allSources,
    );
    expect(result?.priority).toBe(20);
  });

  it('defaults priority to 0 when source has no priority set', () => {
    const result = matchSource(
      'https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/scenarios/app-platform/aks/security',
      allSources,
    );
    expect(result?.priority).toBe(0);
  });

  it('returns a copy of tags (not a reference to the original)', () => {
    const result = matchSource(
      'https://learn.microsoft.com/en-us/azure/aks/overview',
      allSources,
    );
    result!.tags.source_category = 'modified';
    expect(aksDocs.tags.source_category).toBe('aks-docs');
  });
});
