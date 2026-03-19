---
domain: cluster-design
---
# Cluster Design

## Node Pools

**System node pool** — runs CoreDNS, metrics-server, etc. Taint with `CriticalAddonsOnly`.

**User node pools** — run workload pods. Separate from system pool.

## Tiers

| Tier | Use case |
|---|---|
| Free | Dev/test only — no SLA |
| Standard | Production — financially backed SLA |
| Premium | Mission-critical — LTS, higher SLA with AZs |

## LLM Directives

RULES:
- Always separate system and user node pools.
- Always recommend Standard tier or above for production.
