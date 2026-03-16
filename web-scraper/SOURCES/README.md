# Curated Sources

Manually curated list of documentation URLs to crawl for the RAG pipeline. 

- **Initial Approach - auto-crawling** via link following pulled too many niche pages (722 from a single seed) and missed important ones entirely.
- **Current Approach - explicit URL lists with meta data** for higher quality control and more granular priority tuning.
  - Currently ca. 64 URLs
  - TODO: add more granular pages within sub-topics, e.g. networking or security.

## YAML File Schema

Each `.yaml` file represents a topic group. The crawler fetches only the listed URLs — no link following.

```yaml
group_title: String        # required — label for the group (becomes source_name in pipeline)
group_priority: Number     # optional — default priority for URLs in this group
workloads: [String]        # optional — workload types (e.g. web, ai, stateful, all)
scenarios: [String]        # optional — scenario tags (e.g. enterprise, private, all)
description: String        # optional — curation notes (not passed to pipeline)
urls:
  - url: String            # required — page URL to crawl
    title: String          # optional — page title override
    priority: Number       # optional — overrides group_priority
    doc_type: String       # optional — overview, reference, how-to, guidance, article
    tags: [String]         # optional — additional tags
    comments: String       # optional — curation notes (not passed to pipeline)
```

## Doc Priority Resolution

Priority is used for retrieval boosting (higher = more important in search results).

1. URL-level `priority` if set
2. Otherwise `group_priority` if set
3. Otherwise defaults to **10**

## Human Curation - Fields Not Passed to Pipeline

`comments` and `description` are for human curation only — they help decide what to include and at what priority, but are stripped when the crawler runs.
