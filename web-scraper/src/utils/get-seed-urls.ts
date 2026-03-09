import { type Source } from '../types.js';

/**
 * Collect all seed URLs across all sources, deduplicated.
 * These are the starting points for the crawl.
 */
export function getSeedUrls(sources: Source[]): string[] {
  const urls = new Set<string>();
  for (const source of sources) {
    for (const url of source.seed_urls) {
      urls.add(url);
    }
  }
  return [...urls];
}
