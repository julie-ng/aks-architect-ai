export default defineAppConfig({
  localStorageKey: 'aks-architect:chat-sessions',
  ui: {
    prose: {
      p: {
        base: 'my-2 leading-normal text-pretty',
      },
    },
  },
  citations: {
    /** Class(es) always applied to citation links */
    base: 'citation',
    /** URL hostname → extra class(es) */
    domains: {
      'learn.microsoft.com': 'citation-msft',
      'azure.microsoft.com': 'citation-msft',
      'kubernetes.io': 'citation-k8s',
    } as Record<string, string>,
    /** Class(es) when no domain matches */
    fallback: 'citation-web',
  },
})
