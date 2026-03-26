import type { SpecEntry } from '~~/shared/types/spec'

type TaxonomyTerm = {
  tag: string
  label: string
  source: string
}

/**
 * Extracts topic and answer tags from a collection of spec entries.
 *
 * For each entry, produces:
 * - One `topic:<question-key>` tag (e.g. `topic:networking-plugin`)
 * - One `answer:<answer-key>` tag per answer (e.g. `answer:azure_cni_overlay`)
 */
function extractTerms (entries: SpecEntry[], source: string): TaxonomyTerm[] {
  const terms: TaxonomyTerm[] = []

  for (const entry of entries) {
    const questionKey = entry.path.split('/').pop()
    if (!questionKey) continue

    terms.push({
      tag: `topic:${questionKey}`,
      label: entry.spec.title,
      source,
    })

    for (const answer of entry.spec.answers) {
      terms.push({
        tag: `answer:${answer.key}`,
        label: answer.label ?? answer.key,
        source: `${source}/${questionKey}`,
      })
    }
  }

  return terms
}

/**
 * GET /api/_debug/taxonomy
 *
 * Returns the full tag vocabulary derived from requirements and decisions
 * content frontmatter. Used for developing the chunk-tagging pipeline.
 */
export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const config = useRuntimeConfig()
  if (config.appEnvironment !== 'development') {
    throw createError({ statusCode: 404, message: 'Not Found' })
  }

  const [decisionEntries, requirementEntries] = await Promise.all([
    queryCollection(event, 'decisions').select('path', 'spec').all() as unknown as Promise<SpecEntry[]>,
    queryCollection(event, 'requirements').select('path', 'spec').all() as unknown as Promise<SpecEntry[]>,
  ])

  const terms = [
    ...extractTerms(requirementEntries, 'requirements'),
    ...extractTerms(decisionEntries, 'decisions'),
  ]

  return {
    total: terms.length,
    topics: terms.filter(t => t.tag.startsWith('topic:')),
    answers: terms.filter(t => t.tag.startsWith('answer:')),
  }
})
