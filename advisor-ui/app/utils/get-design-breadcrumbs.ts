import type { BreadcrumbItem } from '@nuxt/ui'

export default function (
  design: { title: string, id: string } | null,
  options?: { action: string },
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    {
      label: 'Designs',
      to: '/designs',
    },
  ]

  if (design) {
    items.push({
      label: design.title,
      ...(options?.action ? { to: `/designs/${design.id}` } : {}),
    })
  }

  if (options?.action) {
    items.push({ label: options.action })
  }

  return items
}
