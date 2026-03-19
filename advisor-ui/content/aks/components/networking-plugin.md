---
title: Networking Plugins
designer:
  title: Select a CNI Networking Plugin
  description: |
    The container networking interface (CNI) plugin determines who pods receive their IP addresses.
  question: |
    Choose an Azure CNI plugin
  question_type: radio
  reference:
    title: AKS Docs - Choosing a CNI Plugin
    url: https://learn.microsoft.com/en-us/azure/aks/concepts-network-cni-overview#choosing-a-cni-plugin
  answers:
  - key: azure_cni_overlay
    label: Azure CNI Overlay
    highlights:
      - Best for conserving IPs for virtual networks
      - Maximum node count supported by API server plus 250 pods per node
      - Simpler configuration
      - No direct external pod IP access
      
  - key: azure_cni_pod_subnet
    label: Azure CNI Pod Subnet
    highglights:
      - Direct external pod access
      - Modes for efficient IP usage for virtual networks or large cluster scale support (preview)
      
  - key: azure_cni_node_subnet
    label: 'Azure CNI Node Subnet (Legacy)'
    highlights: 
      - Direct external pod access
      - Simpler configuration
      - Limited scale
      - Inefficient use of IPs for virtual networks
  - key: kubenet
    title: Kubenet (legacy)
    description: |
      This is the legacy default model. Deprecation was announced March 2025.
    disabled: true
---

## AKS Networking Plugins

There are two types of networks that determine how a pod receives its IP address.

- **Overlay network** - pods get IP addresses from a separate private CIDR that exists only within the cluster, with traffic leaving the cluster SNAT'd behind the node's IP. 

- **Flat networks** - pods get real VNet IP addresses and are directly reachable from outside the cluster without NAT, at the cost of consuming significantly more IP space.

### Azure CNI Overlay (recommended default)

Pods get IPs from a private overlay CIDR separate from your VNet, with outbound traffic SNAT'd through the node IP. Choose this for most new clusters where you want to conserve VNet IP space and don't need pods to be directly reachable from outside the cluster.

### Azure CNI Pod Subnet (recommended flat network option)

Pods get real VNet IPs from a dedicated pod subnet, meaning they are directly reachable from peered networks and on-premises without NAT. Choose this when external services need to initiate connections directly to pod IPs, or when you have strict requirements around non-SNAT'd traffic.

### Azure CNI Node Subnet (legacy flat)

Pods and nodes share the same VNet subnet, giving pods direct VNet connectivity but consuming IP space very inefficiently. Only use this if you have a specific dependency on a managed VNet and cannot use Pod Subnet instead.

### Kubenet (legacy overlay)

A basic overlay model where nodes get VNet IPs but pods sit behind NAT, requiring manually managed user-defined routes for pod routing. Avoid for new clusters as it is being retired in March 2028.
