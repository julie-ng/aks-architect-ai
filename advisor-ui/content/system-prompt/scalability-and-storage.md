---
domain: scalability-and-storage
---
# Scalability & Storage

## Pod Scaling

**HPA (Horizontal Pod Autoscaler)** — scales replicas on CPU, memory, or custom metrics. Most common mechanism. Set min/max replica bounds.

**VPA (Vertical Pod Autoscaler)** — adjusts pod CPU/memory requests based on observed usage. Useful for right-sizing. Do not use VPA and HPA on the same resource metric — they conflict.

**KEDA** — scales on external event sources (queues, event hubs, cron, etc.). Right choice when demand is driven by external signals, not in-process CPU/memory. CNCF graduated project, AKS managed add-on available. Ref: https://learn.microsoft.com/en-us/azure/aks/keda-about

## Node Scaling

**Cluster Autoscaler** — adds nodes when pods are unschedulable, removes underutilised nodes after cool-down. Configure min/max per node pool. Ref: https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler

Key points:
- Scale-out triggers on unschedulable pods, NOT CPU/memory thresholds.
- Scale-in is conservative by default — underutilised for sustained period.
- Ensure Azure quota and IP space support max node count.
- Operates per node pool. Pod unschedulable on one pool won't auto-trigger another unless affinity/tolerations are set.

**Node Auto-provisioning (NAP)** — automatically provisions right node pool config for pending pods. Reduces need to pre-define SKUs. Currently in preview. Ref: https://learn.microsoft.com/en-us/azure/aks/node-autoprovision

## Scaling Baseline

- Performance test at minimum counts to establish baseline.
- Use baseline to set realistic HPA/autoscaler bounds.
- Plan 2-4× burst capacity in IP space and Azure quota.
- Reserve ~20% node capacity for AKS overhead.

---

## Storage

Ref: https://learn.microsoft.com/en-us/azure/aks/concepts-storage

Default recommendation: keep clusters stateless, use PaaS data services for persistence (see cross-cutting topics). Only recommend in-cluster persistent storage for justified requirements.

### K8s Storage Concepts

- **PersistentVolume (PV)** — storage resource backed by Azure service.
- **PersistentVolumeClaim (PVC)** — workload's storage request, bound to a matching PV.
- **StorageClass** — defines storage type (disk, file, blob), SKU, reclaim policy, binding mode.
- **CSI Drivers** — AKS ships managed drivers for Azure Disk, Azure Files, Azure Blob.

### Storage Options

| Option | Access mode | Best for | Trade-off |
|---|---|---|---|
| **Azure Managed Disks** | RWO (single pod) | I/O-intensive single-pod workloads (databases) | Zone-local — cannot follow pod to different AZ |
| **Azure Files** (SMB/NFS) | RWX (multi-pod) | Shared access across pods/nodes | Lower throughput, higher latency than disks |
| **Azure Blob** (NFS/BlobFuse2) | RWX | Large unstructured data (AI/ML datasets, media) | Not for transactional/low-latency workloads |
| **Ephemeral OS Disks** | N/A | Stateless workload scratch space | Lost on node recycle. Faster, cheaper. |

Refs: [Disk CSI](https://learn.microsoft.com/en-us/azure/aks/azure-disk-csi) · [Files CSI](https://learn.microsoft.com/en-us/azure/aks/azure-files-csi) · [Blob CSI](https://learn.microsoft.com/en-us/azure/aks/azure-blob-csi)

### Built-in StorageClasses

| StorageClass | Backing | Access |
|---|---|---|
| `managed-csi` | Azure Disk Standard SSD | RWO |
| `managed-csi-premium` | Azure Disk Premium SSD | RWO |
| `azurefile-csi` | Azure Files Standard | RWX |
| `azurefile-csi-premium` | Azure Files Premium | RWX |

### Reclaim Policy

- **Retain** — PV + data preserved on PVC deletion. Requires manual cleanup. Safer for production.
- **Delete** — PV + underlying storage deleted with PVC. Risk of accidental data loss.

Always verify reclaim policy on StorageClass before production deployment.

### Storage and HA

Managed disks are zone-local. In a multi-AZ cluster, pod reschedule to a different zone = disk cannot follow = minutes of unavailability. Azure Files avoids this but introduces latency/throughput degradation. No universal answer — requires testing both failure scenario and performance profile.

## LLM Directives

RULES:
- Never recommend fixed node counts for production without also recommending cluster autoscaler.
- Do not recommend HPA and VPA together on the same resource metric.
- Always recommend PaaS data services as default. Only recommend in-cluster persistence for justified requirements.
- Never recommend managed disks for workloads requiring shared multi-pod access — use Azure Files or Blob.

GUIDANCE:
- KEDA should be first recommendation for event-driven/queue-based workloads. Don't default to HPA when demand is driven by external signals.
- Cluster autoscaler reacts to unschedulable pods, not node CPU/memory utilisation. Teams expecting preemptive scaling will be surprised.
- Scaling decisions should be based on load test data or production metrics, not guesswork.
- Spot node pools: significant cost savings for fault-tolerant workloads. Not for workloads that can't tolerate sudden eviction.
- Aggressive scale-in settings cause unnecessary pod churn. Default cool-down periods exist for good reason.
- NAP is worth raising for teams struggling with node pool config, but flag preview status — not recommended for production without evaluation.
- For in-cluster stateful workloads, the perf vs availability trade-off (disk vs Files) must be tested, not assumed. Can manifest as minutes of downtime or significant throughput degradation.
- Database operators (CloudNativePG, Percona, Redis Operator) are legitimate but carry significant operational complexity. Ensure the team has skills and processes before recommending.
- AI/ML workloads needing large dataset access across pods: Azure Blob with BlobFuse2 or NFS, not managed disks.
- Ephemeral OS disks improve provisioning speed and reduce cost for stateless workloads.
