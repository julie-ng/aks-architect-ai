---
title: Networking
description: Something about networking
---

# Networking Guide

::content-alert{title="Warning" color="warning" icon="i-lucide-triangle-alert" variant="subtle"}
This content was written by AI and wrong, e.g. no new workload should ever use AGIC. For testing purposes only.
::

### Pod networking (CNI)
How pods get IP addresses and talk to each other. Your main choices today:

- **Azure CNI Overlay** — the current recommended default. Pods get IPs from a private overlay space, not your VNet. Conserves VNet IPs significantly.
- **Azure CNI (non-overlay)** — every pod gets a real VNet IP. Simple to reason about, but you'll burn through IP space fast in large clusters.
- **Cilium** — now a first-class option on AKS. eBPF-based, better observability, more powerful network policy. Worth evaluating if you care about network-level visibility or have complex policy requirements.
- **Kubenet** — being retired March 2028. Don't start new clusters on it.

### Network policy (pod-to-pod traffic control)

How you restrict which pods can talk to which. Options:
- **Azure NPM** — fine for most workloads
- **Calico** — more features, not covered by standard Azure support
- **Cilium** — if you're already using Cilium as your CNI, use its policy engine too

Must be enabled at cluster creation. You cannot add it later.

### Ingress & egress

How traffic gets in and out of the cluster — covered well by the baseline architecture we looked at earlier (App Gateway → internal LB → ingress controller for in, Azure Firewall via UDR for out).

## Network Security & Traffic Flow

The baseline has four traffic categories you must explicitly design for:

| Traffic | Baseline approach |
|---|---|
| **Ingress** | App Gateway (WAF) → Internal LB → Ingress controller → pods |
| **Egress** | All outbound via Azure Firewall with UDRs |
| **Pod-to-pod** | Kubernetes NetworkPolicy (Azure NPM or Calico) |
| **Management** | Private cluster + Azure Bastion tunnel |

Practical notes:
- **App Gateway with WAF** is the default ingress entry point. If you're already running Azure Front Door globally, that changes the architecture.
- **Azure Firewall for egress** is the secure baseline default. It's not cheap. For smaller teams or non-sensitive workloads, NAT Gateway is simpler — but you lose traffic inspection. Know the trade-off.
- **Ingress controller choice**: The baseline uses Traefik as an example. In practice, **NGINX** (open source or the managed NGINX Ingress Controller) is more common in the field. Application Gateway Ingress Controller (AGIC) is worth considering if you want to collapse a tier. This is one of the areas with genuine optionality — pick what your team can operate.
- **NetworkPolicy**: Enable it at cluster creation — you cannot add it later. Azure NPM is fine for most. Cilium (now a first-class option in AKS) is worth evaluating if you want advanced observability or eBPF-based policy.
