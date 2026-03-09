import { describe, it, expect } from 'vitest';
import { getSeedUrls } from './get-seed-urls.js';
import { type Source } from '../types.js';

const makeSource = (urls: string[]): Source => ({
  name: 'test',
  description: '',
  seed_urls: urls,
  allowed_globs: ['https://example.com/**'],
  tags: {},
});

describe('getSeedUrls', () => {
  it('collects seed URLs from a single source', () => {
    const sources = [makeSource(['https://example.com/start'])];
    expect(getSeedUrls(sources)).toEqual(['https://example.com/start']);
  });

  it('merges seed URLs from multiple sources', () => {
    const sources = [
      makeSource(['https://a.com/']),
      makeSource(['https://b.com/']),
    ];
    expect(getSeedUrls(sources)).toEqual(['https://a.com/', 'https://b.com/']);
  });

  it('deduplicates identical URLs across sources', () => {
    const sources = [
      makeSource(['https://a.com/', 'https://shared.com/']),
      makeSource(['https://shared.com/', 'https://b.com/']),
    ];
    expect(getSeedUrls(sources)).toEqual([
      'https://a.com/',
      'https://shared.com/',
      'https://b.com/',
    ]);
  });

  it('returns an empty array when there are no sources', () => {
    expect(getSeedUrls([])).toEqual([]);
  });
});
