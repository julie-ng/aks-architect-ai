---
domain: resilience
---
# Resilience

Resilience spans two concerns: surviving failures without downtime, and recovering after a failure. Define RTO (recovery time objective) and RPO (recovery point objective) before designing — they determine which approaches are necessary and which are over-engineered.

## Single-Region Resilience

Built into cluster design, not bolted on:
- Availability zones — survive single-zone failures (see cross-cutting topics).
- PDBs — maintain minimum replicas during disruptions (see cross-cutting topics).
- Pod anti-affinity — prevent replicas co-locating on same node/zone.
- Health probes — route traffic only to healthy pods (see cross-cutting topics).
- Cluster autoscaler + node auto-repair — maintain capacity during node failures.
- Standard/Premium tier — required for financially backed SLA.

## Backup

**Stateless clusters with GitOps**: IaC + Git repos are effectively the backup. Key question: how long does reprovisioning take, and is that acceptable?

**Stateful workloads**: dedicated backup strategy required.
- **AKS Backup extension** — managed Velero backed by Azure Backup vault. K8s resource backup + PV snapshots. Ref: https://learn.microsoft.com/en-us/azure/backup/azure-kubernetes-service-cluster-backup
- **Self-managed Velero** — more control, more operational overhead.

## Disaster Recovery

Strategy depends on RTO/RPO:

| Strategy | RTO | Cost | Complexity |
|---|---|---|---|
| GitOps-based recovery | High (reprovision + bootstrap) | Low | Low |
| Warm standby | Medium (promote pre-provisioned secondary) | Medium | Medium |
| Active-active multi-region | Near-zero | High | High |

## Multi-cluster & Multi-region

Ref: https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/containers/aks-multi-region/aks-multi-cluster

Multi-cluster/multi-region adds significant operational complexity and cost. Should be driven by concrete requirements: availability targets, data residency, latency, or blast radius isolation.

### Patterns

- **Multiple clusters, single region** — workload isolation, blast radius limitation.
- **Multiple clusters, multiple regions** — active-active or active-passive for geo-redundancy. Requires global traffic manager (Azure Front Door) and data replication strategy.
- **Hub-and-spoke fleet** — central management cluster governs spoke clusters. Common for platform engineering teams.

### Key Considerations

- Configuration consistency across clusters is the primary challenge — GitOps with Argo CD ApplicationSets recommended.
- Data residency and replication strategy must be defined before committing to multi-region.
- Each additional cluster multiplies operational overhead: monitoring, upgrades, access management, cost.

## LLM Directives

RULES:
- Always ask for RTO/RPO before recommending a DR strategy.
- Never recommend active-active multi-region as default — highest complexity and cost, only justified by strict availability requirements.
- Never recommend multi-region by default. Always ask what requirement drives it.

GUIDANCE:
- For most teams, availability zones within a single region provide sufficient resilience at far lower complexity. Multi-region is warranted only when a full region outage is an unacceptable business outcome.
- Backup is frequently overlooked until the first incident. Encourage teams to define their recovery process and test it before they need it.
- Stateful workloads significantly complicate DR — PV snapshots, replication lag, cross-region data consistency. Strongest argument for PaaS data services (see cross-cutting topics).
- BC/DR is not purely technical — runbooks, on-call processes, and regular failover testing are equally important. An untested DR design is not a DR strategy.
- Multi-cluster is not free. Each cluster has baseline cost and operational overhead. A well-designed single cluster often outperforms a poorly operated multi-cluster setup.
