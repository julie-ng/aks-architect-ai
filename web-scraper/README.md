# Scraping offical AKS Docs

This is JavaScript based web crawler for the official docs. It scrapes the pages and saves content as markdown.

### Features

- **Curated sources** — YAML-configured crawl targets with human-selected URLs, not blind web crawling
- **Metadata tagging** — chunks carry `scenario` and `workload` tags for filtered retrieval
- **Priority scoring** — human-assigned scores per source, used downstream for re-ranking in RAG retrieval

### Learning: Curation > Auto-crawling

* Auto-crawling 700+ AKS docs diluted retrieval quality despite priority boosting. 
* Manually curating ~50 high-value sources produced better results
 
> [!IMPORTANT]
> **Conclusion**: domain expertise in source selection mattered more than volume - important insight for creating business value with AI. It's not a magic solution but rather **effective AI _amplifies human expertise_**.

## Sources

This application uses YAML files to configure which URLs to crawl. 

- Docs are grouped manually - mostly for human curation to keep track of what we have and/or missing.
- URLs can be tagged by
  - `scenario`, e.g. enterprise
  - `workload`, e.g. web, microservices

### Example File

See [`./SOURCES/`](./SOURCES/) for more.

```yaml
group_title: Baseline Architectures from Azure Architecture Center
scenarios:
  - all
workloads:
  - all
urls:
  # Baseline
  - url: https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/containers/aks/baseline-aks
    priority: 25

  # Microservices
  - url: https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/containers/aks-microservices/aks-microservices-advanced
    priority: 15
    workloads:
      - microservices
      - web

  # Multi-region
  - url: https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/containers/aks-multi-region/aks-multi-cluster
    priority: 15
    scenarios:
      - enterprise
```

> [!NOTE]
> This project prioritizes [Baseline Architecture for AKS](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/containers/aks/baseline-aks) above all other docs with a priority score of `25`. This long reference architecture serves as a guiding "framework" for LLM and app to steer the user's architectural decisions.

## Commands

To run crawler

```
npm run crawl
```


Clear old data

```bash
npm run clean
```
