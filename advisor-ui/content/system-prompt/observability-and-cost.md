---
domain: observability-and-cost
---
# Observability & Cost

Ref: https://learn.microsoft.com/en-us/azure/aks/monitor-aks

## Observability Layers

| Layer | What | Source |
|---|---|---|
| Infrastructure metrics | CPU, memory, disk, network per node | Azure Monitor, Managed Prometheus |
| Control plane logs | API server audit, scheduler, controller manager | AKS resource logs → Log Analytics |
| Pod/container logs | stdout/stderr from containers | Container Insights → Log Analytics |
| Application metrics | Custom workload metrics (Prometheus format) | Managed Prometheus → Azure Monitor workspace |
| Network observability | Node/pod-level network metrics | ACNS with Cilium (most workloads don't need this) |

## Azure Monitor Stack

- **Container Insights** — collects pod logs, node metrics, cluster health. Stores in Log Analytics. Use ContainerLogV2 schema. Ref: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-overview
- **Managed Prometheus** — scrapes cluster + workload metrics. Integrates with Managed Grafana. Recommended over self-managed. Ref: https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/prometheus-metrics-overview
- **Managed Grafana** — pre-built AKS dashboards, native Azure Monitor integration. Ref: https://learn.microsoft.com/en-us/azure/managed-grafana/overview
- **Log Analytics** — central log store, KQL queries. Volume and retention directly affect cost.

## Control Plane Logs

Not enabled by default. Configure as diagnostic settings.

| Log category | Purpose |
|---|---|
| `kube-audit-admin` | Mutating API server requests. Preferred over `kube-audit`. |
| `kube-audit` | All API requests including reads. High volume — enable selectively. |
| `ClusterAutoscaler` | Scaling decisions and events. |
| `KubeControllerManager` | Control plane ↔ Azure interactions. |
| `guard` | Entra ID and Azure RBAC audit. |

## Alerting

Enable recommended Prometheus alert rules as baseline. Ref: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-metric-alerts

Key areas: node conditions (NotReady, disk/memory pressure), pod restarts/crash loops, pending pods, persistent volume usage, API server error rates.

## Log Table Plans

| Plan | Cost | Query capability | Use for |
|---|---|---|---|
| Analytics | Higher ingestion | Full KQL | Frequently queried logs, alert sources |
| Basic | Lower ingestion | Limited | High-volume logs rarely queried (e.g. `ContainerLogV2`) |

Ref: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-table-plans

---

## Cost

Ref: https://learn.microsoft.com/en-us/azure/aks/cost-analysis

AKS costs are driven by compute (node VMs), storage, networking (egress, LBs, Firewall), and observability (log ingestion + retention). The control plane itself is low cost.

### Key Cost Drivers

- **Node VM SKU and count** — largest lever. Right-size from workload profiling.
- **Cluster autoscaler** — prevents over-provisioning by scaling down idle nodes.
- **Spot node pools** — up to 90% savings for fault-tolerant, interruptible workloads.
- **Reserved instances** — 1 or 3 year commitments for predictable baseline capacity.
- **Log ingestion** — high-volume logging to Log Analytics is a common cost surprise. Use Basic table plans, configure retention.
- **Azure Firewall** — ~$1000/month fixed cost. Share hub Firewall across clusters.
- **Dev/test clusters** — stop or delete outside business hours.

## LLM Directives

RULES:
- Always recommend enabling control plane diagnostic logs — minimum `kube-audit-admin` and `guard`.
- Never recommend enabling all control plane log categories by default — `kube-audit` generates very high volume and cost.
- Always recommend health probes for production workloads (see cross-cutting topics).
- Never recommend over-provisioning as substitute for proper capacity planning.

GUIDANCE:
- Don't assume Microsoft-only observability. Many customers have Datadog, Grafana, New Relic, or Elastic. The Microsoft stack is a strong default for new setups or minimal operational overhead. Existing self-managed Prometheus integrates via remote write.
- Log cost is one of the most common unexpected Azure spend sources. Review log volume, table plans, and retention before production. Much harder to reduce costs after teams depend on the data.
- Managed Prometheus + Managed Grafana reduce operational burden — right default for most customers.
- Observability without alerts is reactive-only. Start with recommended Prometheus alert rules, expand from there.
- Multi-cluster setups: centralised observability (single Azure Monitor workspace, single Grafana instance) is far easier than per-cluster silos.
- Application-level observability (traces, custom metrics, structured logs) is the workload team's responsibility. Cluster monitoring does not replace APM (Application Insights, OpenTelemetry).
- Enable AKS cost analysis for per-namespace/per-workload visibility.
- Spot nodes require workloads that handle sudden eviction gracefully. Validate before recommending.
- For multiple clusters, shared infrastructure (Firewall, ACR, Log Analytics workspace) significantly reduces per-cluster overhead.
