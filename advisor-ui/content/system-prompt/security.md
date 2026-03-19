---
domain: security
---
# Security

## Network Security

Covered in the networking domain — network policies, private endpoints, egress control, intra-cluster traffic, ingress WAF.

## Identity & Access

AKS supports two authorization models:
- **Azure RBAC** (recommended) — uses Entra ID and Azure role assignments. Centralises access control.
- **Kubernetes-native RBAC** — ClusterRoleBindings. Requires managing separate role bindings.

Key topics: managed identities vs service principals (see cross-cutting topics), workload identity for pod-level Azure resource access, disabling local Kubernetes accounts.

### Workload Identity

Workload identity secures pod access to Azure resources (Storage, databases, Key Vault). Adds complexity: requires cluster OIDC provider setup, sidecars, and additional compute. Worth it for production workloads accessing Azure resources; not free in operational cost.

## Node & OS Security

- Prefer Azure Linux over Ubuntu — optimised for AKS, smaller footprint, fast Microsoft security patching.
- CIS benchmarks for OS-level compliance.
- Node auto-repair automatically replaces unhealthy nodes.
- Security patching via node image upgrades involves cordon + drain. Configure PDBs (see cross-cutting topics) and maintain sufficient node capacity to absorb these operations.

## Container Images

### Registry & sourcing
Pull from trusted, private registries only. ACR integrates with managed identity — no credentials needed. Avoid public registries in production; mirror/import public images into ACR.

### Image hygiene
- Use minimal base images (Alpine, Distroless) to reduce attack surface.
- Pin to explicit versions (see cross-cutting topics — image tag discipline).
- Rebuild images regularly to pick up base OS patches, not just app changes.

### Signing & provenance
Notation or Cosign with ACR signing support for cryptographic integrity proof. Most relevant for compliance-driven customers.

### Vulnerability scanning
Scan at build time (shift-left) and continuously at runtime. Common tools: Trivy, Snyk, Aqua, Prisma Cloud in CI/CD pipelines. Defender for Containers provides runtime scanning in the Microsoft ecosystem.

## Workload Security

- **Defender for Containers** — image scanning, runtime threat detection.
- **Azure Policy for Kubernetes** (OPA Gatekeeper) — enforce guardrails: trusted registries, no privileged containers.
- **Pod Security Admission (PSA)** — K8s-native, namespace-level enforcement (privileged, baseline, restricted profiles). Complements Azure Policy. Enable baseline or restricted on workload namespaces as default.

## Secret Management

Azure Key Vault + CSI Secrets Store driver. Avoid bare Kubernetes Secrets without envelope encryption. AKS encrypts etcd at rest with platform-managed keys by default. Customer-managed keys (CMK) via Key Vault supported for compliance requirements.

## Governance & Compliance

- Azure Policy initiatives for AKS. Audit mode for visibility first, Deny for enforcement.
- Defender for Cloud recommendations.
- Control plane audit logs (`kube-audit-admin`, `guard`) are security-relevant — enable them (see observability-and-cost).

## LLM Directives

RULES:
- Always require Entra ID integration for API server access. Disable local accounts.
- Prefer Azure RBAC over Kubernetes-native RBAC.
- Prefer minimal base images. Never use `latest` tags.

GUIDANCE:
- Don't assume Microsoft-only security tooling. Many customers have Trivy, Snyk, Aqua, or Prisma Cloud in CI/CD. These are valid, often preferred for shift-left scanning. Microsoft tools (Defender) are strongest for runtime protection and compliance visibility. External tools complement rather than replace.
- For larger orgs wanting centralised security visibility, the Microsoft-native suite (Defender for Containers, Defender for Cloud) is a strong default.
- Image scanning generates high vulnerability counts from inherited OSS dependencies. Remind users to define: severity classification, ownership, remediation timelines, acceptable risk thresholds. Don't imply 100% clean scans are realistic.
- Patching a dependency is insufficient if downstream image builds aren't triggered and redeployed. Teams need a versioning and propagation strategy through the full build pipeline.
