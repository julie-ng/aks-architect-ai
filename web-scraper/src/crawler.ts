import { CheerioCrawler, Dataset, RequestQueue, log } from 'crawlee';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { type Source, type PageResult } from './types.js';
import { getAllowedGlobs, matchSource, autoDetectDocType } from './utils/index.js';

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
  const allowedGlobs = getAllowedGlobs(sources);
  const requestQueue = await RequestQueue.open('aks-crawl');
  const dataset = await Dataset.open('aks-docs');

  log.info(`Loaded ${sources.length} sources with ${allowedGlobs.length} glob patterns`);

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

    async requestHandler({ request, $, enqueueLinks }) {
      const url = request.url;

      // Strip locale redirects (e.g. /en-us/azure/aks/ → keep, /de-de/... → skip)
      if (!url.includes('/en-us/')) {
        log.debug(`Skipping non-en-us URL: ${url}`);
        return;
      }

      log.info(`Crawling: ${url}`);

      // Extract main content
      const $main = $('main').first();
      if (!$main.length) {
        log.warning(`No <main> element found: ${url}`);
        return;
      }

      // Remove noise elements before markdown conversion
      $main.find([
        '.feedback-section',
        '.action-container',
        '.contributor-guide',
        '#side-doc-outline',
        '.page-metadata',
        '.breadcrumb',
        '.alert-holder',
      ].join(', ')).remove();

      const title = $('h1').first().text().trim();
      const description = $('meta[name="description"]').attr('content') ?? '';
      const mainHtml = $main.html() ?? '';
      const markdown = turndown.turndown(mainHtml);

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
        tags,
        crawled_at: new Date().toISOString(),
      };

      await dataset.pushData(result);
      log.info(`  ✓ Saved: "${title}" [${result.source_name}]`);

      // Discover and enqueue links within allowed scope
      await enqueueLinks({
        globs: allowedGlobs,
        transformRequestFunction(req) {
          // Strip URL fragments and query params for deduplication
          const clean = req.url.split('#')[0].split('?')[0];
          req.url = clean;
          return req;
        },
      });
    },

    failedRequestHandler({ request }) {
      log.error(`Permanently failed: ${request.url}`);
    },
  });

  return { crawler, requestQueue, dataset };
}
