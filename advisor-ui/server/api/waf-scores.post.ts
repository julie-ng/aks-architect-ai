import { z } from 'zod'
import type { SpecEntry, WafPillarScores } from '~~/shared/types/spec'
import { getWafImpact, getWafBaseline } from '~~/shared/utils/spec-helpers'

const WAF_PILLARS = ['reliability', 'security', 'cost', 'operations', 'performance'] as const

/** Maps question keys to selected answer keys (string for radio, string[] for checkbox). */
type Selections = Record<string, string | string[]>

const bodySchema = z.object({
  decisions: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  requirements: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
})

/**
 * Collects WAF pillar scores for each selected answer across all questions.
 *
 * Iterates over user selections (e.g. `{ "aks-mode": "automatic" }`), looks up
 * each answer in the content entries, and extracts the WAF scores using the
 * provided `extractor` (either `getWafImpact` or `getWafBaseline`).
 *
 * Checkbox questions may have multiple selected answers, each contributing
 * its own score object. Answers without WAF data are skipped.
 */
function collectScores (
  entries: SpecEntry[],
  selections: Selections,
  extractor: (entries: SpecEntry[], qKey: string, aKey: string) => WafPillarScores | undefined,
): WafPillarScores[] {
  const scores: WafPillarScores[] = []
  for (const [key, selected] of Object.entries(selections)) {
    const selectedKeys = Array.isArray(selected) ? selected : [selected]
    for (const aKey of selectedKeys) {
      const score = extractor(entries, key, aKey)
      if (score) scores.push(score)
    }
  }
  return scores
}

/**
 * Averages an array of WAF score objects into a single score per pillar.
 *
 * For each pillar, sums all values (treating missing as 0) and divides by
 * the number of score objects. Result is rounded to the nearest integer.
 *
 * Example: given `[{ security: 10 }, { security: 5, cost: -3 }]`, returns
 * `{ reliability: 0, security: 8, cost: -2, operations: 0, performance: 0 }`.
 */
function averagePillarScores (scores: WafPillarScores[]): Record<string, number> {
  const count = scores.length || 1
  const result: Record<string, number> = {}
  for (const pillar of WAF_PILLARS) {
    result[pillar] = Math.round(
      scores.reduce((sum, s) => sum + (s[pillar] ?? 0), 0) / count
    )
  }
  return result
}

/**
 * POST /api/waf-scores
 *
 * Computes WAF pillar scores from the user's architectural decisions and
 * business requirements. Returns two score sets:
 *
 * - `impact`: averaged `waf_impact` from component answers (architectural decisions)
 * - `baseline`: averaged `waf_baseline` from requirement answers (business context)
 *
 * Both are computed as the mean across all selected answers, rounded to integers.
 * The UI uses `impact` for the score band position and `baseline` for the marker.
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

  const { decisions = {}, requirements = {} } = result.data

  // Fetch content schemas for both collections in parallel
  const [componentEntries, requirementEntries] = await Promise.all([
    queryCollection(event, 'components').select('path', 'spec').all() as unknown as Promise<SpecEntry[]>,
    queryCollection(event, 'requirements').select('path', 'spec').all() as unknown as Promise<SpecEntry[]>,
  ])

  const impact = averagePillarScores(collectScores(componentEntries, decisions, getWafImpact))
  const baseline = averagePillarScores(collectScores(requirementEntries, requirements, getWafBaseline))

  return { impact, baseline }
})
