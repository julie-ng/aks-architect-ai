import type { SpecEntry, WafPillarScores } from '~~/shared/types/spec'

/**
 * Finds the spec entry whose path key matches the provided key.
 *
 * @param entries - The list of spec entries to search
 * @param key - The path key to match against each entry
 * @returns The matching spec entry, or undefined when no entry matches
 */
export function findSpecEntryByKey (entries: SpecEntry[], key: string): SpecEntry | undefined {
  return entries.find(e => e.path.split('/').pop() === key)
}

/**
 * Resolves the display title for a question spec entry.
 *
 * @param entries - The list of spec entries to search
 * @param key - The question key to match
 * @returns The question title, or the key when no matching entry is found
 */
export function getQuestionTitle (entries: SpecEntry[], key: string): string {
  return findSpecEntryByKey(entries, key)?.spec?.title ?? key
}

/**
 * Looks up the label for a question answer in the spec entries.
 *
 * @param entries - The list of spec entries to search
 * @param qKey - The question key to match
 * @param aKey - The answer key to match
 * @returns The answer label, or the answer key when no match is found
 */
export function getAnswerLabel (entries: SpecEntry[], qKey: string, aKey: string): string {
  const spec = findSpecEntryByKey(entries, qKey)?.spec
  return spec?.answers.find(a => a.key === aKey)?.label ?? aKey
}

/**
 * Retrieves the WAF pillar impact scores for a selected answer.
 *
 * @param entries - The list of spec entries to search
 * @param qKey - The question key to match
 * @param aKey - The answer key to match
 * @returns The WAF impact scores, or undefined when no match is found
 */
export function getWafImpact (entries: SpecEntry[], qKey: string, aKey: string): WafPillarScores | undefined {
  const spec = findSpecEntryByKey(entries, qKey)?.spec
  return spec?.answers.find(a => a.key === aKey)?.waf_impact
}

/**
 * Retrieves the WAF pillar baseline scores for a selected answer.
 *
 * @param entries - The list of spec entries to search
 * @param qKey - The question key to match
 * @param aKey - The answer key to match
 * @returns The WAF baseline scores, or undefined when no match is found
 */
export function getWafBaseline (entries: SpecEntry[], qKey: string, aKey: string): WafPillarScores | undefined {
  const spec = findSpecEntryByKey(entries, qKey)?.spec
  return spec?.answers.find(a => a.key === aKey)?.waf_baseline
}
