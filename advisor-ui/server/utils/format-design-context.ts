type DesignFields = Record<string, string | string[]>

function humanize (slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function formatRecord (record: DesignFields): string {
  return Object.entries(record)
    .map(([key, val]) => {
      const label = humanize(key)
      const value = Array.isArray(val) ? val.map(humanize).join(', ') : humanize(val)
      return `- ${label}: ${value}`
    })
    .join('\n')
}

export function formatDesignContext (
  requirements: DesignFields,
  decisions: DesignFields,
): string {
  const parts: string[] = []
  if (Object.keys(requirements).length > 0) {
    parts.push(`Requirements:\n${formatRecord(requirements)}`)
  }
  if (Object.keys(decisions).length > 0) {
    parts.push(`Architectural Decisions:\n${formatRecord(decisions)}`)
  }
  return parts.join('\n\n')
}
