import { describe, it, expect } from 'vitest';
import { matchSource } from './match-source.js';
import { type Source } from '../types.js';

const networking: Source = {
  name: 'networking',
  seed_urls: ['https://example.com/networking'],
  allowed_globs: [],
  priority: 20,
  tags: { doc_type: 'overview', group: 'Networking' },
};

const monitoring: Source = {
  name: 'monitoring',
  seed_urls: ['https://example.com/monitoring'],
  allowed_globs: [],
  priority: 15,
  tags: { doc_type: 'how-to', group: 'Monitoring' },
};

const allSources = [networking, monitoring];

describe('matchSource', () => {
  it('matches a URL by exact seed_url lookup', () => {
    const result = matchSource('https://example.com/networking', allSources);
    expect(result?.name).toBe('networking');
    expect(result?.priority).toBe(20);
    expect(result?.tags.doc_type).toBe('overview');
  });

  it('returns null when no source matches', () => {
    const result = matchSource('https://example.com/unknown', allSources);
    expect(result).toBeNull();
  });

  it('returns the correct priority', () => {
    const result = matchSource('https://example.com/monitoring', allSources);
    expect(result?.priority).toBe(15);
  });

  it('returns a copy of tags (not a reference)', () => {
    const result = matchSource('https://example.com/networking', allSources);
    result!.tags.doc_type = 'modified';
    expect(networking.tags.doc_type).toBe('overview');
  });
});
