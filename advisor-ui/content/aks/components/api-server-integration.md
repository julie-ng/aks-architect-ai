---
title: API Server Integration
designer:
  title: Kubernetes API Server Integration
  description: |
    Remember this just determines whether the network is used as a security perimeter. Your API server is still secured via credentials.
  question: |
    How is the cluster's API server integrated with your network?
  question_type: radio
  reference:
    title: Create an AKS cluster with API Server VNet Integration
    url: https://learn.microsoft.com/en-us/azure/aks/api-server-vnet-integration
  answers:
  - key: private
    title: Private Network Integration
    description: |
      API server endpoint is only reachable inside your VNet and requires VPN tunnel, jumpbox, or your IP whitelisted to access.
  - key: public
    title: No VNet Integration, i.e. publicly accessible
    description: |
      Default option - your API server is hosted in an Azure managed VNet and accessible from all networks. Simplifies management tasks.
---

## Kubernetes API server

The Kubernetes API server is the control plane endpoint for your specific cluster — every kubectl command, CI/CD pipeline, and internal component talks to it. There are 3 networking configurations

## Integration Options

### Public Cluster (default)

The API server exists in a Microsoft managed VNet and all requests are routed via FQDNs.

### API Server VNet Integration

API Server VNet Integration projects this Azure-managed endpoint (invisible in any resource group) into a delegated subnet in your VNet, establishing a network perimeter so all API traffic stays private.
  
Choose this option for any production cluster where you want private API server access without DNS complexity. 

### Private Cluster

This older private cluster model achieves the same private networking goal using Private Link and a Private DNS Zone. It works, but introduces DNS resolution challenges across peered VNets and on-premises connections that VNet Integration avoids. 
 
Customers often choose this over VNet Server integration if they cannot meet the delegated subnet requirement.
