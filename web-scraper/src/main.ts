import { log, LogLevel } from 'crawlee';
import { loadSources, getSeedUrls } from './config.js';
import { createCrawler } from './crawler.js';

log.setLevel(LogLevel.INFO);

// Load sources configuration
const sources = loadSources();
const seedUrls = getSeedUrls(sources);

log.info(`Starting crawl with ${sources.length} sources and ${seedUrls.length} seed URLs`);
for (const source of sources) {
  log.info(`  • ${source.name}: ${source.seed_urls.length} seed URL(s)`);
}

// Create and run crawler
const { crawler } = await createCrawler(sources);
await crawler.addRequests(seedUrls);
await crawler.run();

log.info('Crawl complete. Results saved to storage/datasets/aks-docs/');
