/**
 * A documentation source defined in sources.yaml
 */
export interface Source {
  name: string;
  description: string;
  seed_urls: string[];
  allowed_globs: string[];
  priority?: number;
  tags: Record<string, string | string[]>;
}

/**
 * Top-level structure of sources.yaml
 */
export interface SourcesConfig {
  sources: Source[];
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
