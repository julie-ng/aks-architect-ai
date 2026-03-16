import { log, LogLevel } from 'crawlee';
import { loadSources, getSeedUrls } from './utils/index.js';
import { createCrawler } from './crawler.js';

log.setLevel(LogLevel.INFO);

// Load curated sources from SOURCES/ directory
const sources = loadSources();
const seedUrls = getSeedUrls(sources);

log.info(`Starting crawl with ${seedUrls.length} curated URLs`);

// Create and run crawler
const { crawler } = await createCrawler(sources);
await crawler.addRequests(seedUrls);
await crawler.run();

log.info('Crawl complete. Results saved to storage/datasets/aks-docs/');
