import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { type Source, type SourcesConfig } from '../types.js';

const SOURCES_PATH = resolve(import.meta.dirname, '../..', 'SOURCES.yaml');

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
