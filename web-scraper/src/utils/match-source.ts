import { type Source } from '../types.js';

/**
 * Given a URL, find the best matching source and return its name + tags.
 * "Best match" = source whose allowed_globs produce the longest prefix match.
 * Returns null if no source matches.
 */
export function matchSource(url: string, sources: Source[]): { name: string; priority: number; tags: Record<string, string | string[]> } | null {
  let bestMatch: Source | null = null;
  let bestPrefixLen = 0;

  for (const source of sources) {
    // TODO: temporary workaround — seed-only sources (allowed_globs: [])
    // never match via glob prefix, so check seed_urls as exact match
    if (source.seed_urls.includes(url)) {
      return {
        name: source.name,
        priority: source.priority ?? 0,
        tags: { ...source.tags },
      };
    }

    for (const glob of source.allowed_globs) {
      // Extract the fixed prefix (everything before the first wildcard)
      const prefix = glob.replace(/\*.*$/, '');
      if (url.startsWith(prefix) && prefix.length > bestPrefixLen) {
        bestPrefixLen = prefix.length;
        bestMatch = source;
      }
    }
  }

  if (!bestMatch) return null;

  return {
    name: bestMatch.name,
    priority: bestMatch.priority ?? 0,
    tags: { ...bestMatch.tags },
  };
}
