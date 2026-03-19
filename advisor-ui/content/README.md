# Content Files

This application leverages [@nuxt/content](https://content.nuxt.com/) 

- as a CMS for pages
- as place system prompt markdown files 
- as structured schema to generate the "architecture" framework

### System Prompt

The files have been moved into a private git submodule. See [system-prompt.example/](./system-prompt.example/) for format.

### Architecture Schema

Example schema structure, that LLM uses to guide the user.

```yaml
# Architecture Decision Framework
# Each field represents a cluster design decision.
# Values are populated from user intake form responses.
cluster:
  tier: # free | standard | premium — drives SLA and LTS eligibility
  networking:
    cni: # azure | overlay | kubenet — irreversible, affects IP planning
    ingress: # app-routing | gateway-api | istio — drives L7 strategy
    egress: # nat-gateway | azure-firewall | none
  node_pools:
    system_pool_sku: # VM SKU for system pool
    # ...
```
