export default defineAppConfig({
  ui: {
    prose: {
      h1: {
        base: 'text-2xl font-bold mb-4',
      },
      h2: {
        base: 'text-xl font-bold mt-6 mb-3',
      },
      h3: {
        base: 'text-lg font-bold mt-4 mb-2',
      },
      h4: {
        base: 'text-base font-semibold mt-3 mb-1',
      },
      p: {
        base: 'my-2 leading-normal text-pretty',
      },
    },
    breadcrumb: {
      slots: {
        separatorIcon: 'text-dimmed',
      },
      variants: {
        active: {
          true: {
            link: 'font-normal text-slate-500',
          },
          false: {
            link: 'font-normal text-slate-500',
          },
        },
      },
    },
    dropdownMenu: {
      slots: {
        content: 'w-(--reka-dropdown-menu-trigger-width)'
      }
    }
  },
  chat: {
    untitledLabel: '(untitled chat)',
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
