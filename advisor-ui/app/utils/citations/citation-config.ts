export interface CitationClassConfig {
  /** Class(es) always applied to citation links */
  base: string
  /** URL hostname → extra class(es) */
  domains: Record<string, string>
  /** Class(es) when no domain matches */
  fallback: string
}

/**
 * Configurable CSS classes for inline citation links.
 * Change values here to swap between custom classes and Tailwind utilities.
 */
export const citationClasses: CitationClassConfig = {
  base: 'citation',
  domains: {
    'learn.microsoft.com': 'citation-msft',
    'azure.microsoft.com': 'citation-msft',
    'kubernetes.io': 'citation-k8s',
  },
  fallback: 'citation-web',
}
