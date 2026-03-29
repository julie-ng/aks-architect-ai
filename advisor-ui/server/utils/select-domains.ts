/**
 * Keyword-to-domain mapping for selecting relevant knowledge domains
 * based on the user's question. Each domain has distinctive terms
 * that indicate the question is about that topic.
 */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  networking: [
    'networking', 'network',
    'vnet', 'subnet', 'hub-and-spoke', 'ingress', 'egress', 'application gateway',
    'istio', 'service mesh', 'network policy', 'private link', 'nat gateway',
    'azure firewall', 'service endpoint', 'gateway api', 'loadbalancer',
    'clusterip', 'nodeport', 'cni', 'pod communication', 'dns',
  ],
  security: [
    'security', 'secure',
    'workload identity', 'rbac', 'entra id', 'pod security', 'azure policy',
    'gatekeeper', 'opa', 'defender', 'image scanning', 'vulnerability',
    'image signing', 'secrets store', 'key vault', 'cosign', 'notation',
    'trivy', 'privileged', 'etcd encryption', 'container security', 'admission',
  ],
  operations: [
    'operations', 'ops',
    'upgrade', 'node image', 'version', 'blue-green', 'surge', 'maintenance window',
    'auto-repair', 'gitops', 'argo cd', 'flux', 'ci/cd', 'canary', 'rolling update',
    'flagger', 'immutable infrastructure', 'certificate rotation', 'deployment strategy',
    'bootstrap', 'n-2',
  ],
  'observability-and-cost': [
    'observability', 'cost',
    'container insights', 'prometheus', 'grafana', 'log analytics', 'control plane logs',
    'kube-audit', 'kql', 'spot', 'reserved instance', 'pricing',
    'containerlogv2', 'metrics', 'alert', 'monitoring', 'logging',
    'budget',
  ],
  resilience: [
    'resilience', 'resilient',
    'availability zone', 'pod disruption budget', 'pdb', 'anti-affinity', 'rto', 'rpo',
    'velero', 'backup', 'disaster recovery', 'active-active', 'warm standby',
    'multi-cluster', 'multi-region', 'blast radius', 'failover', 'bc/dr',
    'high availability', 'ha',
  ],
  'scalability-and-storage': [
    'scalability', 'storage', 'scale', 'scaling',
    'hpa', 'vpa', 'keda', 'autoscaler', 'auto-provisioning', 'node pool',
    'persistentvolume', 'pvc', 'storageclass', 'csi driver', 'managed disk',
    'azure files', 'azure blob', 'ephemeral os', 'blobfuse',
    'stateful',
  ],
}

/**
 * Selects relevant knowledge domains based on keyword matching against
 * the user's question. Always includes 'cluster-design' as a baseline.
 *
 * @param question - The user's question text
 * @returns Array of domain names to include in the system prompt
 */
export function selectDomains (question: string): string[] {
  const q = question.toLowerCase()
  const matched = new Set<string>(['cluster-design'])

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const keyword of keywords) {
      // Word boundary match to avoid false positives (e.g. "ha" inside "what")
      const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
      if (pattern.test(q)) {
        matched.add(domain)
        break
      }
    }
  }

  return [...matched]
}
