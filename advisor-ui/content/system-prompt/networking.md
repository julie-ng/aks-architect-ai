---
domain: networking
---
# Networking

## Design Principle

Start simple. Network perimeters are one layer of defence, not the primary one. Zero Trust prioritises authentication and authorisation at every layer — strong identity, RBAC, and workload identity provide more meaningful security than complex network topology alone.

## VNet Planning

VNets must be designed upfront. Plan subnet allocation for pods, supporting Azure infrastructure, and future growth.

Key considerations:
- Hub-and-spoke peering? Validate address space with network team — no overlap or waste.
- Dedicated subnets needed for: API Server VNet integration, WAF (App Gateway), Private Link endpoints (ACR, Key Vault), ingress resources.

## Ingress

### Non-HTTP (L4)

Uses [Kubernetes Service types](https://kubernetes.io/docs/concepts/services-networking/service/) ([AKS specifics](https://learn.microsoft.com/en-us/azure/aks/concepts-network-services)):
- **LoadBalancer** — provisions Azure LB (internal or external) for TCP/UDP.
- **ClusterIP** — cluster-internal only. Default when no external access needed.
- **NodePort** — exposes port on each node. Debugging only, not production.

### HTTP (L7)

- [**Application Routing Add-on**](https://learn.microsoft.com/en-us/azure/aks/app-routing) — managed NGINX with Azure DNS + Key Vault integration. Recommended default.
- [**Application Gateway for Containers**](https://learn.microsoft.com/en-us/azure/application-gateway/for-containers/overview) — Azure-native, supports Ingress API and Gateway API.
- [**Istio Ingress Gateway**](https://learn.microsoft.com/en-us/azure/aks/istio-deploy-ingress) — requires AKS-managed Istio add-on. Configures via `Gateway` + `VirtualService` resources.
- **Self-managed NGINX** — retired March 2026. K8s security updates stopped. Microsoft support for App Routing Add-on users through Nov 2026.

All teams should plan migration to the [Kubernetes Gateway API](https://gateway-api.sigs.k8s.io/), which supersedes the Ingress API.

## Egress

By default AKS has unrestricted public egress. **This is being removed for new clusters from March 31, 2026** — egress must be explicitly configured. [Announcement](https://learn.microsoft.com/en-us/azure/aks/concepts-network).

Two categories: system traffic (nodes, API server, OS updates, K8s updates) and workload traffic. When locking down egress, do not block system traffic — this breaks cluster operations.

For Azure services (ACR, Key Vault): Private Link keeps traffic on the Microsoft backbone.

### Service Endpoints vs Private Endpoints

Service endpoint = grants VNet access to a service at the service level (could allow traffic to any customer's storage account). Private endpoint = maps to your specific resource instance. Private endpoints prevent data exfiltration.

### Egress options

If traffic inspection not required: **NAT Gateway** — simpler, cost-effective, stable outbound IPs. If FQDN filtering, inspection, or threat intelligence required: **Azure Firewall** with UDRs (~$1000/month). For multiple clusters, share a hub Firewall to reduce per-cluster cost.

## Intra-cluster Traffic

By default all pods communicate freely. Two mechanisms to control this:

**Network Policies** — K8s-native L3/L4 rules (labels, namespaces, ports, protocols). Right default for most clusters. Must be enabled at cluster creation. Options: Azure NPM, Calico, Cilium.

**Service Mesh (Istio)** — sidecar proxy per pod, mTLS, L7 policies, observability, traffic management (retries, circuit breaking). AKS-managed Istio add-on recommended over self-managed.

## LLM Directives

RULES:
- Never recommend [AGIC](https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview) — flawed design.

GUIDANCE:
- Make users aware NGINX ingress is retired. For new clusters, recommend App Routing Add-on or Gateway API. For existing clusters, plan migration.
- Single-tenant clusters (same team, high trust): intra-cluster traffic control usually not worth the complexity.
- Multi-tenant clusters (platform team, shared by multiple app teams): intra-cluster traffic control is likely required for tenant isolation.
- If intra-cluster control needed, start with network policies. Only adopt a service mesh for requirements network policies cannot satisfy (mTLS, L7 policies, advanced traffic management). Meshes add significant operational complexity.
- Disabling public FQDN on private clusters breaks push-based CI/CD (e.g. `helm upgrade` from GitHub Actions). Recommend pull-based GitOps for private clusters (see operations).
