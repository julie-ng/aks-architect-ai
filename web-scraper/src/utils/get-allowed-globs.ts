import { type Source } from '../types.js';

/**
 * Collect all allowed globs across all sources, deduplicated.
 * Used to configure enqueueLinks scope in the crawler.
 */
export function getAllowedGlobs(sources: Source[]): string[] {
  const globs = new Set<string>();
  for (const source of sources) {
    for (const glob of source.allowed_globs) {
      globs.add(glob);
    }
  }
  return [...globs];
}
