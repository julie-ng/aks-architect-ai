import { CheerioCrawler, Dataset, RequestQueue, log } from 'crawlee';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { type Source, type PageResult } from './types.js';
import { matchSource, autoDetectDocType } from './utils/index.js';

// ---------------------------------------------------------------------------
// HTML → Markdown converter
// ---------------------------------------------------------------------------
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndown.use(gfm);

// Strip elements that are navigation/chrome, not content
turndown.remove([
  'nav',
  'aside',
  'header',
  'footer',
  'script',
  'style',
  'noscript',
]);

// ---------------------------------------------------------------------------
// Crawler factory
// ---------------------------------------------------------------------------
export async function createCrawler(sources: Source[]) {
  const requestQueue = await RequestQueue.open('aks-crawl');
  const dataset = await Dataset.open('aks-docs');

  log.info(`Loaded ${sources.length} curated URLs`);

  const crawler = new CheerioCrawler({
    requestQueue,

    // Rate limiting — be polite to learn.microsoft.com
    maxConcurrency: 3,
    maxRequestsPerMinute: 40,
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 60,
    navigationTimeoutSecs: 30,
    useSessionPool: true,
    persistCookiesPerSession: true,

    async requestHandler({ request, $ }) {
      const url = request.url;

      // Strip locale redirects (e.g. /en-us/azure/aks/ → keep, /de-de/... → skip)
      if (!url.includes('/en-us/')) {
        log.debug(`Skipping non-en-us URL: ${url}`);
        return;
      }

      log.info(`Crawling: ${url}`);

      // Extract main content — grab div.content blocks inside <main>, but skip
      // the one that only wraps the <h1> title (it duplicates content otherwise).
      const $allContent = $('main div.content');
      if (!$allContent.length) {
        log.warning(`No <main div.content> element found: ${url}`);
        return;
      }

      const $contentBlocks = $allContent.filter((_, el) => {
        const $el = $(el);
        // Skip if the only child is an h1 (title-only block)
        return !($el.children().length === 1 && $el.children().first().is('h1'));
      });
      if (!$contentBlocks.length) {
        log.warning(`No content blocks after filtering title-only div: ${url}`);
        return;
      }

      // Remove noise elements from each content block before conversion
      const noiseSelector = [
        '.feedback-section',
        '.action-container',
        '.contributor-guide',
        '#side-doc-outline',
        '#center-doc-outline',
        '#article-header',
        '#article-metadata',
        '.page-metadata',
        '.breadcrumb',
        '.alert-holder',
        '[unauthorized-private-section]',
        '[data-id="ai-summary"]',
      ].join(', ');
      $contentBlocks.find(noiseSelector).remove();

      const rawTitle = $('title').text().trim();
      const title = rawTitle.replace(/\s*\|\s*Microsoft Learn$/, '');
      const description = $('meta[name="description"]').attr('content') ?? '';
      const combinedHtml = $contentBlocks.map((_, el) => $(el).html()).get().join('\n');
      const markdown = turndown.turndown(combinedHtml);

      // Skip pages with very little content (likely index/redirect pages)
      if (markdown.trim().length < 50) {
        log.debug(`Skipping thin page: ${url}`);
        return;
      }

      // Match source and build tags
      const sourceMatch = matchSource(url, sources);
      const tags = sourceMatch?.tags ?? {};

      // Auto-detect doc_type if not already tagged
      if (!tags.doc_type) {
        const detected = autoDetectDocType(url);
        if (detected) tags.doc_type = detected;
      }

      const result: PageResult = {
        url,
        title,
        description,
        markdown,
        source_name: sourceMatch?.name ?? 'unknown',
        priority: sourceMatch?.priority ?? 0,
        tags,
        crawled_at: new Date().toISOString(),
      };

      await dataset.pushData(result);
      log.info(`  ✓ Saved: "${title}" [${result.source_name}]`);
    },

    failedRequestHandler({ request }) {
      log.error(`Permanently failed: ${request.url}`);
    },
  });

  return { crawler, requestQueue, dataset };
}
