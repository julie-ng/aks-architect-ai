import { describe, it, expect } from 'vitest';
import { getAllowedGlobs } from './get-allowed-globs.js';
import { type Source } from '../types.js';

const makeSource = (globs: string[]): Source => ({
  name: 'test',
  description: '',
  seed_urls: ['https://example.com/'],
  allowed_globs: globs,
  tags: {},
});

describe('getAllowedGlobs', () => {
  it('collects globs from a single source', () => {
    const sources = [makeSource(['https://example.com/docs/**'])];
    expect(getAllowedGlobs(sources)).toEqual(['https://example.com/docs/**']);
  });

  it('merges globs from multiple sources', () => {
    const sources = [
      makeSource(['https://a.com/**']),
      makeSource(['https://b.com/**']),
    ];
    expect(getAllowedGlobs(sources)).toEqual([
      'https://a.com/**',
      'https://b.com/**',
    ]);
  });

  it('deduplicates identical globs across sources', () => {
    const sources = [
      makeSource(['https://a.com/**']),
      makeSource(['https://a.com/**', 'https://b.com/**']),
    ];
    expect(getAllowedGlobs(sources)).toEqual([
      'https://a.com/**',
      'https://b.com/**',
    ]);
  });

  it('returns an empty array when there are no sources', () => {
    expect(getAllowedGlobs([])).toEqual([]);
  });
});
