import { type Source } from '../types.js';

/**
 * Given a URL, find the matching source by exact seed_url lookup.
 * Returns null if no source matches.
 */
export function matchSource(url: string, sources: Source[]): { name: string; priority: number; tags: Record<string, string | string[]> } | null {
  for (const source of sources) {
    if (source.seed_urls.includes(url)) {
      return {
        name: source.name,
        priority: source.priority,
        tags: { ...source.tags },
      };
    }
  }

  return null;
}
