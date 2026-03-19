---
domain: cluster-design
---
# Cluster Design

Ref: https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/containers/aks/baseline-aks

## Node Pools

**System node pool** — runs CoreDNS, metrics-server, etc. Taint with `CriticalAddonsOnly`. Baseline: 3× small VM (e.g. D2dv5).

**User node pools** — run workload pods. Separate from system pool. Multiple pools supported (per workload type, team, or VM SKU).

Key decisions: VM SKU, node count + autoscaling bounds, OS disk size, availability zones (see cross-cutting topics), taints/labels/tags for scheduling and cost allocation.

## VM Sizing

- Reserve ~20% node capacity for AKS system overhead.
- Larger nodes reduce per-node DaemonSet overhead (monitoring agents, log collectors).
- Start small, rely on cluster autoscaler rather than pre-sizing for peak.
- Set pod resource requests and limits for accurate scheduling.

## Tiers

| Tier | Use case |
|---|---|
| Free | Dev/test only — no SLA |
| Standard | Production — financially backed SLA |
| Premium | Mission-critical — LTS, higher SLA with AZs |

## OS

Prefer Azure Linux over Ubuntu — smaller footprint, optimised for AKS, faster Microsoft security patching. Prefer Linux over Windows unless workload requires it.

## Add-ons vs Self-managed

AKS add-ons: Microsoft-managed lifecycle, upgrades, compatibility. Self-managed (Helm/manifests): operator owns versioning and upgrade compatibility. Prefer add-ons where functionality is equivalent.

Trade-offs: add-ons offer less control over resource naming (Azure and K8s resources named by AKS — test in preprod if strict naming conventions or Azure Policy enforcement exist). Add-ons patch on Microsoft's cadence; for compliance environments with strict patch SLAs (24-48h), self-managed may offer faster control.

## LLM Directives

RULES:
- Always separate system and user node pools.
- Always recommend Standard tier or above for production.
- Never recommend Free tier for production.
- Always recommend availability zones for production in supported regions.

GUIDANCE:
- VM sizing is workload-dependent. Start with D-series general purpose, adjust after profiling. Don't prescribe SKUs without understanding the workload.
- Node pool config (AZs, OS, CNI) is largely irreversible without cluster rebuild — flag these as upfront decisions.
- For teams new to Kubernetes, flag that AKS requires ongoing investment in upgrades, monitoring, and capacity management.
- Multi-tenancy on a single cluster: highlight cost efficiency vs isolation complexity. Requires network policies, namespace isolation, and resource quotas.
- Automatic upgrades are only safe if the team already deploys without manual coordination. Otherwise, build a deliberate upgrade process.
- Stateful workloads in HA: managed disks are zone-local (pod reschedule to different AZ = minutes of unavailability). Azure Files avoids this but introduces latency. Default to PaaS data stores (see cross-cutting topics). If in-cluster storage required, treat perf/availability trade-off as first-class design decision.
