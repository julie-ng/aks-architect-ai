import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { loadSources } from './load-sources.js';

const FIXTURES_DIR = resolve(import.meta.dirname, '__fixtures__');

function fixture(name: string, content: string): string {
  mkdirSync(FIXTURES_DIR, { recursive: true });
  const path = resolve(FIXTURES_DIR, name);
  writeFileSync(path, content);
  return path;
}

function cleanup() {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
}

describe('loadSources', () => {
  it('loads a valid sources.yaml with all required fields', () => {
    const path = fixture('valid.yaml', `
sources:
  - name: test-source
    description: A test source
    seed_urls:
      - https://example.com/docs/
    allowed_globs:
      - "https://example.com/docs/**"
    tags:
      source_category: test
`);
    const sources = loadSources(path);
    expect(sources).toHaveLength(1);
    expect(sources[0].name).toBe('test-source');
    expect(sources[0].seed_urls).toEqual(['https://example.com/docs/']);
    expect(sources[0].tags.source_category).toBe('test');
    cleanup();
  });

  it('loads multiple sources from a single file', () => {
    const path = fixture('multi.yaml', `
sources:
  - name: source-a
    description: First
    seed_urls: [https://a.com/]
    allowed_globs: ["https://a.com/**"]
    tags: { category: a }
  - name: source-b
    description: Second
    seed_urls: [https://b.com/]
    allowed_globs: ["https://b.com/**"]
    tags: { category: b }
`);
    const sources = loadSources(path);
    expect(sources).toHaveLength(2);
    expect(sources.map(s => s.name)).toEqual(['source-a', 'source-b']);
    cleanup();
  });

  it('throws when the file has no sources array', () => {
    const path = fixture('empty.yaml', `something_else: true`);
    expect(() => loadSources(path)).toThrow('No sources found');
    cleanup();
  });

  it('throws when a source is missing a name', () => {
    const path = fixture('no-name.yaml', `
sources:
  - description: Missing name
    seed_urls: [https://example.com/]
    allowed_globs: ["https://example.com/**"]
    tags: {}
`);
    expect(() => loadSources(path)).toThrow('must have a "name"');
    cleanup();
  });

  it('throws when a source has no seed_urls', () => {
    const path = fixture('no-seeds.yaml', `
sources:
  - name: bad-source
    description: No seeds
    seed_urls: []
    allowed_globs: ["https://example.com/**"]
    tags: {}
`);
    expect(() => loadSources(path)).toThrow('has no seed_urls');
    cleanup();
  });

  it('throws when a source has no allowed_globs', () => {
    const path = fixture('no-globs.yaml', `
sources:
  - name: bad-source
    description: No globs
    seed_urls: [https://example.com/]
    tags: {}
`);
    expect(() => loadSources(path)).toThrow('is missing allowed_globs');
    cleanup();
  });

  it('throws when the file does not exist', () => {
    expect(() => loadSources('/nonexistent/path.yaml')).toThrow();
  });
});
