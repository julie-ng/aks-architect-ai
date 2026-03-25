import { z } from 'zod'

const WAF_PILLARS = ['reliability', 'security', 'cost', 'operations', 'performance'] as const

const bodySchema = z.object({
  decisions: z.record(z.string(), z.union([z.string(), z.array(z.string())]))
})

/**
 * POST /api/waf-scores — compute average WAF pillar scores from decisions.
 */
export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => bodySchema.safeParse(body))
  if (!result.success) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Invalid request body',
      errors: z.treeifyError(result.error),
    }
  }

  const { decisions } = result.data

  const entries = await queryCollection(event, 'components')
    .select('stem', 'spec')
    .all()

  const impacts: Record<string, number>[] = []

  for (const entry of entries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = entry as any
    const spec = e?.spec
    if (!spec?.answers) continue

    const key = e.stem
    if (!key || !decisions[key]) continue

    const selectedKeys = Array.isArray(decisions[key]) ? decisions[key] : [decisions[key]]

    for (const answer of spec.answers) {
      if (selectedKeys.includes(answer.key) && answer.waf_impact) {
        impacts.push(answer.waf_impact)
      }
    }
  }

  const count = impacts.length || 1
  const scores: Record<string, number> = {}

  for (const pillar of WAF_PILLARS) {
    scores[pillar] = Math.round(
      impacts.reduce((sum, impact) => sum + (impact[pillar] ?? 0), 0) / count
    )
  }

  return { scores }
})
