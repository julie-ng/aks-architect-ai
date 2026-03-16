/**
 * A single curated URL entry from a SOURCES/*.yaml file
 */
export interface CuratedUrl {
  url: string;
  title?: string;
  priority?: number;
  doc_type?: string;
  workloads?: string[];
  scenarios?: string[];
  tags?: string[];
  comments?: string;
}

/**
 * A topic group from a SOURCES/*.yaml file
 */
export interface CuratedGroup {
  group_title: string;
  group_priority?: number;
  description?: string;
  workloads?: string[];
  scenarios?: string[];
  urls: CuratedUrl[];
}

/**
 * Internal source representation used by the crawler and downstream pipeline.
 * Produced by flattening CuratedGroup files into one Source per URL.
 */
export interface Source {
  name: string;
  seed_urls: string[];
  allowed_globs: string[];
  priority: number;
  tags: Record<string, string | string[]>;
}

/**
 * Output record saved per crawled page
 */
export interface PageResult {
  url: string;
  title: string;
  description: string;
  markdown: string;
  source_name: string;
  priority: number;
  tags: Record<string, string | string[]>;
  crawled_at: string;
}
