import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { type CuratedGroup, type Source } from '../types.js';

const DEFAULT_PRIORITY = 10;
const SOURCES_DIR = resolve(import.meta.dirname, '../..', 'SOURCES');

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildTags(group: CuratedGroup, url: CuratedGroup['urls'][number]): Record<string, string | string[]> {
  const tags: Record<string, string | string[]> = {};

  tags.group = group.group_title;

  if (url.doc_type) tags.doc_type = url.doc_type;

  const workloads = url.workloads ?? group.workloads;
  if (workloads?.length) tags.workloads = workloads;

  const scenarios = url.scenarios ?? group.scenarios;
  if (scenarios?.length) tags.scenarios = scenarios;

  if (url.tags?.length) tags.extra = url.tags;

  return tags;
}

export function loadSources(dirPath: string = SOURCES_DIR): Source[] {
  const files = readdirSync(dirPath)
    .filter(f => f.endsWith('.yaml'))
    .sort();

  if (!files.length) {
    throw new Error(`No .yaml files found in ${dirPath}`);
  }

  const sources: Source[] = [];

  for (const file of files) {
    const filePath = resolve(dirPath, file);
    const raw = readFileSync(filePath, 'utf-8');
    const group = parse(raw) as CuratedGroup;

    if (!group?.group_title) {
      throw new Error(`${file}: missing "group_title"`);
    }
    if (!group.urls?.length) {
      throw new Error(`${file}: "${group.group_title}" has no urls`);
    }

    const groupName = slugify(group.group_title);

    for (const entry of group.urls) {
      if (!entry.url) {
        throw new Error(`${file}: "${group.group_title}" has a url entry without a "url" field`);
      }

      sources.push({
        name: groupName,
        seed_urls: [entry.url],
        allowed_globs: [],
        priority: entry.priority ?? group.group_priority ?? DEFAULT_PRIORITY,
        tags: buildTags(group, entry),
      });
    }
  }

  return sources;
}
