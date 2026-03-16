import { describe, it, expect, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { loadSources } from './load-sources.js';

const FIXTURES_DIR = resolve(import.meta.dirname, '__fixtures__');

function fixtureDir(files: Record<string, string>): string {
  const dir = resolve(FIXTURES_DIR, 'sources');
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(resolve(dir, name), content);
  }
  return dir;
}

afterEach(() => {
  rmSync(FIXTURES_DIR, { recursive: true, force: true });
});

describe('loadSources', () => {
  it('loads a single file with one URL', () => {
    const dir = fixtureDir({
      'networking.yaml': `
group_title: Networking
urls:
  - url: https://example.com/networking
    priority: 20
    doc_type: overview
`,
    });
    const sources = loadSources(dir);
    expect(sources).toHaveLength(1);
    expect(sources[0].name).toBe('networking');
    expect(sources[0].seed_urls).toEqual(['https://example.com/networking']);
    expect(sources[0].allowed_globs).toEqual([]);
    expect(sources[0].priority).toBe(20);
    expect(sources[0].tags.doc_type).toBe('overview');
    expect(sources[0].tags.group).toBe('Networking');
  });

  it('loads multiple files and flattens URLs', () => {
    const dir = fixtureDir({
      'a.yaml': `
group_title: Alpha
urls:
  - url: https://example.com/a1
  - url: https://example.com/a2
`,
      'b.yaml': `
group_title: Beta
urls:
  - url: https://example.com/b1
`,
    });
    const sources = loadSources(dir);
    expect(sources).toHaveLength(3);
    expect(sources.map(s => s.seed_urls[0])).toEqual([
      'https://example.com/a1',
      'https://example.com/a2',
      'https://example.com/b1',
    ]);
  });

  it('uses url priority over group_priority', () => {
    const dir = fixtureDir({
      'test.yaml': `
group_title: Test
group_priority: 5
urls:
  - url: https://example.com/a
    priority: 25
  - url: https://example.com/b
`,
    });
    const sources = loadSources(dir);
    expect(sources[0].priority).toBe(25);
    expect(sources[1].priority).toBe(5);
  });

  it('defaults priority to 10 when neither url nor group priority is set', () => {
    const dir = fixtureDir({
      'test.yaml': `
group_title: Test
urls:
  - url: https://example.com/a
`,
    });
    const sources = loadSources(dir);
    expect(sources[0].priority).toBe(10);
  });

  it('inherits workloads and scenarios from group level', () => {
    const dir = fixtureDir({
      'test.yaml': `
group_title: HA Setups
workloads:
  - all
scenarios:
  - enterprise
  - business-continuity
urls:
  - url: https://example.com/a
`,
    });
    const sources = loadSources(dir);
    expect(sources[0].tags.workloads).toEqual(['all']);
    expect(sources[0].tags.scenarios).toEqual(['enterprise', 'business-continuity']);
  });

  it('url-level workloads and scenarios override group level', () => {
    const dir = fixtureDir({
      'test.yaml': `
group_title: Ingress
workloads:
  - web
  - all
scenarios:
  - all
urls:
  - url: https://example.com/a
  - url: https://example.com/b
    workloads: [ai]
    scenarios: [enterprise, private]
`,
    });
    const sources = loadSources(dir);
    expect(sources[0].tags.workloads).toEqual(['web', 'all']);
    expect(sources[0].tags.scenarios).toEqual(['all']);
    expect(sources[1].tags.workloads).toEqual(['ai']);
    expect(sources[1].tags.scenarios).toEqual(['enterprise', 'private']);
  });

  it('slugifies group_title for source name', () => {
    const dir = fixtureDir({
      'test.yaml': `
group_title: "AI Toolchain Operator"
urls:
  - url: https://example.com/a
`,
    });
    const sources = loadSources(dir);
    expect(sources[0].name).toBe('ai-toolchain-operator');
  });

  it('ignores non-yaml files', () => {
    const dir = fixtureDir({
      'valid.yaml': `
group_title: Test
urls:
  - url: https://example.com/a
`,
      'README.md': '# Not a source file',
    });
    const sources = loadSources(dir);
    expect(sources).toHaveLength(1);
  });

  it('strips comments field (not passed to pipeline)', () => {
    const dir = fixtureDir({
      'test.yaml': `
group_title: Test
description: Group-level notes
urls:
  - url: https://example.com/a
    comments: Curator notes here
`,
    });
    const sources = loadSources(dir);
    expect(sources[0]).not.toHaveProperty('comments');
    expect(sources[0]).not.toHaveProperty('description');
  });

  it('throws when directory has no yaml files', () => {
    const dir = fixtureDir({ 'readme.md': '# nothing' });
    // remove the .md so only empty dir remains... actually just use empty dir
    const emptyDir = resolve(FIXTURES_DIR, 'empty');
    mkdirSync(emptyDir, { recursive: true });
    expect(() => loadSources(emptyDir)).toThrow('No .yaml files');
  });

  it('throws when a file is missing group_title', () => {
    const dir = fixtureDir({
      'bad.yaml': `
urls:
  - url: https://example.com/a
`,
    });
    expect(() => loadSources(dir)).toThrow('missing "group_title"');
  });

  it('throws when a file has no urls', () => {
    const dir = fixtureDir({
      'bad.yaml': `
group_title: Empty
urls: []
`,
    });
    expect(() => loadSources(dir)).toThrow('has no urls');
  });

  it('throws when a url entry has no url field', () => {
    const dir = fixtureDir({
      'bad.yaml': `
group_title: Bad Entry
urls:
  - doc_type: overview
`,
    });
    expect(() => loadSources(dir)).toThrow('without a "url" field');
  });

  it('throws when directory does not exist', () => {
    expect(() => loadSources('/nonexistent/path')).toThrow();
  });
});
