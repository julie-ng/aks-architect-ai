import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { type Source, type SourcesConfig } from './types.js';

const SOURCES_PATH = resolve(import.meta.dirname, '..', 'sources.yaml');

/**
 * Load and validate sources.yaml
 */
export function loadSources(path: string = SOURCES_PATH): Source[] {
  const raw = readFileSync(path, 'utf-8');
  const config = parse(raw) as SourcesConfig;

  if (!config?.sources?.length) {
    throw new Error(`No sources found in ${path}`);
  }

  for (const source of config.sources) {
    if (!source.name) throw new Error('Every source must have a "name"');
    if (!source.seed_urls?.length) throw new Error(`Source "${source.name}" has no seed_urls`);
    if (!source.allowed_globs?.length) throw new Error(`Source "${source.name}" has no allowed_globs`);
  }

  return config.sources;
}

/**
 * Collect all allowed globs across all sources (for enqueueLinks)
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

/**
 * Collect all seed URLs across all sources
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

/**
 * Given a URL, find the best matching source and return its tags.
 * "Best match" = source whose allowed_globs produce the longest prefix match.
 * Falls back to first matching source.
 */
export function matchSource(url: string, sources: Source[]): { name: string; tags: Record<string, string | string[]> } | null {
  let bestMatch: Source | null = null;
  let bestPrefixLen = 0;

  for (const source of sources) {
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
    tags: { ...bestMatch.tags },
  };
}

/**
 * Auto-derive doc_type from URL path patterns common in MS Learn.
 * Only sets doc_type if not already present in source tags.
 */
export function autoDetectDocType(url: string): string | null {
  const path = new URL(url).pathname.toLowerCase();

  if (path.includes('/concepts/') || path.includes('/concept-')) return 'concept';
  if (path.includes('/how-to/') || path.includes('/howto-')) return 'how-to';
  if (path.includes('/quickstart')) return 'quickstart';
  if (path.includes('/tutorial')) return 'tutorial';
  if (path.includes('/best-practice')) return 'best-practice';
  if (path.includes('/troubleshoot')) return 'troubleshooting';
  if (path.includes('/reference/') || path.includes('/api/')) return 'reference';
  if (path.includes('/overview') || path.includes('/intro-')) return 'overview';
  if (path.includes('/sample') || path.includes('/example')) return 'sample';

  return null;
}
