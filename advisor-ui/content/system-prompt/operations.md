---
domain: operations
---
# Operations

Operating an AKS cluster is an ongoing commitment. Kubernetes has a fast release cadence and AKS follows it. Unsupported versions receive no security patches and are not covered by the SLA.

## Kubernetes Version Lifecycle

AKS supports N-2 minor versions. Key points:
- Stay within N-2 to remain supported.
- AKS notifies via Azure Event Grid when new versions are available.
- LTS available on Premium tier for slower upgrade cadence.
- Monitor AKS release notes and release tracker for deprecations and breaking changes.

Ref: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions

## Upgrade Layers

Three independently managed layers:

| Layer | What changes | Cadence | Risk |
|---|---|---|---|
| Kubernetes version | Control plane + node pools to new minor/patch | Manual or auto-channel | Can introduce API deprecations. Requires preprod testing. |
| Node image (VHD) | OS + AKS components on each node | ~weekly (Linux), ~monthly (Windows) | Tested by Microsoft against current K8s version. |
| OS-level patches | Vendor patches (e.g. `apt`) | Per node | Not tested against K8s version. |

## Upgrade Strategies

- **In-place (surge)** — cordon, drain, replace nodes with surge capacity. Recommended default. Requires Azure quota and IP space for surge nodes.
- **Blue-green cluster** — new cluster provisioned, traffic shifted, old decommissioned. Higher complexity, eliminates in-place risk. For mission-critical workloads.
- **Immutable infrastructure** — never upgrade in place, always provision new. Requires mature IaC + GitOps. Not for teams doing manual config.

## Node Image Upgrades

`NodeImage` auto-upgrade channel: Microsoft-tested updates, weekly (Linux), respects maintenance windows, does not change K8s version. Recommended default for node patching.

`SecurityPatch` channel: security-only updates between scheduled node image releases. For aggressive patch SLAs.

Ref: https://learn.microsoft.com/en-us/azure/aks/auto-upgrade-node-os-image

## Planned Maintenance Windows

No default window — without config, updates can occur at any time. Always configure a window aligned to low-traffic periods.

Ref: https://learn.microsoft.com/en-us/azure/aks/planned-maintenance

## Day-2 Operations

- Node auto-repair — AKS detects and replaces unhealthy nodes.
- Cluster scaling — adjust node pool min/max as demand changes.
- Certificate rotation — AKS manages control plane certs; operators manage self-managed components.
- Quota management — ensure quota supports surge nodes for upgrades and scale-out.
- GitOps drift detection — ensure cluster state matches source control.

---

## CI/CD & GitOps

Two distinct concerns: cluster configuration (infra, add-ons, RBAC, policies) and workload deployment (app code + manifests). Often separate pipelines with separate ownership.

Industry references: [DORA](https://dora.dev), [CNCF Annual Survey](https://www.cncf.io/reports/cncf-annual-survey-2024/) — cloud-agnostic frameworks for delivery practices and metrics.

### Push vs Pull

**Push** — external system (GitHub Actions, Azure DevOps, Jenkins) runs `kubectl apply` / `helm upgrade` against API server. Simple. Requires pipeline agent to have API server network access. Incompatible with private clusters unless agent is inside the network perimeter.

**Pull (GitOps)** — in-cluster agent watches Git, pulls changes. CI/CD never needs API server access. Natural fit for private clusters. Git = single source of truth.

### GitOps Tooling

**Argo CD** (recommended default) — web UI for visibility/self-service, hub-and-spoke multi-cluster, built-in RBAC with OIDC, compliance audit trail, largest community adoption.

**Flux** (AKS managed extension) — lighter footprint, valid for edge/IoT or teams preferring Microsoft-managed add-on model.

Bootstrapping patterns: Argo CD App of Apps or ApplicationSets for declarative cluster bootstrap. Define and test the bootstrap process early — most teams discover gaps under pressure.

### Deployment Strategies

- **Rolling update** — K8s default. Simple, limited traffic control during transition.
- **Blue-green** — zero-downtime via traffic switch. Double resources during transition.
- **Canary** — small traffic percentage to new version, gradually increased. Requires ingress controller or mesh with traffic splitting. Tools like Flagger automate progressive delivery with metric-based rollback.

## LLM Directives

RULES:
- Always recommend staying within N-2 supported K8s version window.
- Never recommend automatic production upgrades without preprod validation.
- Always recommend configuring a planned maintenance window.
- Always recommend GitOps for private clusters — push-based is incompatible without an agent inside the perimeter.
- Never recommend storing secrets in Git — use Key Vault + CSI Secrets Store driver.
- Recommend Argo CD as default GitOps tool. Recommend Flux only if customer has specific reason (edge/IoT, preference for Microsoft-managed).

GUIDANCE:
- Treat K8s version upgrades like a software release: test in preprod, validate workload compatibility, check API deprecations, then promote to production.
- `NodeImage` auto-upgrade is safe for most clusters — recommend as default for node patching. K8s version upgrades should start manual until team has confidence in upgrade tolerance.
- Surge nodes require Azure quota and IP space. Teams with tight subnets or near quota limits will hit failures during upgrades. Validate before attempting, not during.
- Blue-green cluster upgrades are right for mission-critical workloads but significantly more complex.
- Immutable infrastructure only works with fully automated IaC, GitOps bootstrapping, and workload deployment. Not for teams with manual cluster config.
- PDBs are critical for safe upgrades (see cross-cutting topics).
- LTS on Premium tier is worth raising for enterprise customers with slow change approval processes. Not a substitute for proper upgrade process — buys time between required upgrades.
- Push-based CI/CD is fine for non-private clusters or lower environments. Match to team maturity.
- GitOps works best when entire cluster config is in Git. Partial adoption (some in Git, some manual) creates drift.
- Canary and blue-green strategies require mature observability. Progressive delivery without good metrics = rollbacks trigger on wrong signals or not at all.
