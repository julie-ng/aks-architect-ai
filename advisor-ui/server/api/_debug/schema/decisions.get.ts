import type { SpecEntry } from '~~/shared/types/spec'

/**
 * GET /api/_debug/schema/decisions
 *
 * Returns the decisions content as a structured JSON with
 * questions, answer keys, labels, and highlights.
 */
export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const config = useRuntimeConfig()
  if (config.appEnvironment !== 'development') {
    throw createError({ statusCode: 404, message: 'Not Found' })
  }

  const entries = await queryCollection(event, 'decisions')
    .select('path', 'spec')
    .all() as unknown as SpecEntry[]

  const questions = entries.map((entry) => {
    const key = entry.path.split('/').pop()!
    return {
      key,
      title: entry.spec.title,
      question_type: entry.spec.question_type,
      answers: entry.spec.answers.map(a => ({
        key: a.key,
        label: a.label ?? a.key,
        highlights: a.highlights ?? [],
      })),
    }
  })

  return { questions }
})
