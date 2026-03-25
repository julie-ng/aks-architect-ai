import { z } from 'zod'
import type { SpecEntry, WafPillarScores } from '~~/shared/types/spec'
import { getWafImpact } from '~~/shared/utils/spec-helpers'

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
    .select('path', 'spec')
    .all() as unknown as SpecEntry[]

  const impacts: WafPillarScores[] = []

  for (const [key, selected] of Object.entries(decisions)) {
    const selectedKeys = Array.isArray(selected) ? selected : [selected]
    for (const aKey of selectedKeys) {
      const impact = getWafImpact(entries, key, aKey)
      if (impact) impacts.push(impact)
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
