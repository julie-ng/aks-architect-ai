/**
 * Schema validation for the real SOURCES/ directory.
 * Catches typos, unknown fields, and structural issues in CI.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { loadSources } from './load-sources.js';

const SOURCES_DIR = resolve(import.meta.dirname, '../..', 'SOURCES');

const VALID_GROUP_KEYS = new Set([
  'group_title',
  'group_priority',
  'description',
  'workloads',
  'scenarios',
  'urls',
]);

const VALID_URL_KEYS = new Set([
  'url',
  'title',
  'description',
  'priority',
  'doc_type',
  'workloads',
  'scenarios',
  'wave',
  'tags',
  'comments',
]);

const VALID_DOC_TYPES = new Set([
  'overview',
  'reference',
  'how-to',
  'guidance',
  'article',
]);

function getYamlFiles(): string[] {
  return readdirSync(SOURCES_DIR)
    .filter(f => f.endsWith('.yaml'))
    .sort();
}

describe('SOURCES/ schema validation', () => {
  it('loadSources() parses all files without errors', () => {
    const sources = loadSources(SOURCES_DIR);
    expect(sources.length).toBeGreaterThan(0);
  });

  it('no duplicate URLs across all files', () => {
    const sources = loadSources(SOURCES_DIR);
    const urls = sources.map(s => s.seed_urls[0]);
    const dupes = urls.filter((url, i) => urls.indexOf(url) !== i);
    expect(dupes, `Duplicate URLs found: ${dupes.join(', ')}`).toEqual([]);
  });

  describe.each(getYamlFiles())('%s', (file) => {
    const raw = readFileSync(resolve(SOURCES_DIR, file), 'utf-8');
    const group = parse(raw) as Record<string, unknown>;

    it('has no unknown top-level keys', () => {
      const unknown = Object.keys(group).filter(k => !VALID_GROUP_KEYS.has(k));
      expect(unknown, `Unknown keys: ${unknown.join(', ')}`).toEqual([]);
    });

    it('group_title is a non-empty string', () => {
      expect(typeof group.group_title).toBe('string');
      expect((group.group_title as string).trim().length).toBeGreaterThan(0);
    });

    it('group_priority is a positive number if set', () => {
      if (group.group_priority !== undefined) {
        expect(typeof group.group_priority).toBe('number');
        expect(group.group_priority as number).toBeGreaterThan(0);
      }
    });

    it('workloads is a string array if set', () => {
      if (group.workloads !== undefined) {
        expect(Array.isArray(group.workloads)).toBe(true);
        for (const w of group.workloads as unknown[]) {
          expect(typeof w, `workload "${w}" is not a string`).toBe('string');
        }
      }
    });

    it('scenarios is a string array if set', () => {
      if (group.scenarios !== undefined) {
        expect(Array.isArray(group.scenarios)).toBe(true);
        for (const s of group.scenarios as unknown[]) {
          expect(typeof s, `scenario "${s}" is not a string`).toBe('string');
        }
      }
    });

    it('every url entry has valid keys only', () => {
      const urls = group.urls as Record<string, unknown>[];
      for (const entry of urls) {
        const unknown = Object.keys(entry).filter(k => !VALID_URL_KEYS.has(k));
        expect(unknown, `URL "${entry.url}" has unknown keys: ${unknown.join(', ')}`).toEqual([]);
      }
    });

    it('every url entry has a valid URL string', () => {
      const urls = group.urls as Record<string, unknown>[];
      for (const entry of urls) {
        expect(typeof entry.url).toBe('string');
        expect((entry.url as string).startsWith('https://'), `Invalid URL: ${entry.url}`).toBe(true);
      }
    });

    it('priority values are positive numbers', () => {
      const urls = group.urls as Record<string, unknown>[];
      for (const entry of urls) {
        if (entry.priority !== undefined) {
          expect(typeof entry.priority, `URL "${entry.url}" priority is not a number`).toBe('number');
          expect(entry.priority as number, `URL "${entry.url}" priority must be > 0`).toBeGreaterThan(0);
        }
      }
    });

    it('wave values are positive integers', () => {
      const urls = group.urls as Record<string, unknown>[];
      for (const entry of urls) {
        if (entry.wave !== undefined) {
          expect(typeof entry.wave, `URL "${entry.url}" wave is not a number`).toBe('number');
          expect(Number.isInteger(entry.wave), `URL "${entry.url}" wave must be an integer`).toBe(true);
          expect(entry.wave as number, `URL "${entry.url}" wave must be > 0`).toBeGreaterThan(0);
        }
      }
    });

    it('doc_type values are from the allowed set', () => {
      const urls = group.urls as Record<string, unknown>[];
      for (const entry of urls) {
        if (entry.doc_type !== undefined) {
          expect(
            VALID_DOC_TYPES.has(entry.doc_type as string),
            `URL "${entry.url}" has invalid doc_type "${entry.doc_type}". Valid: ${[...VALID_DOC_TYPES].join(', ')}`,
          ).toBe(true);
        }
      }
    });
  });
});
