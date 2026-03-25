import type { SpecEntry, WafPillarScores } from '~~/shared/types/spec'

export function findSpecEntryByKey (entries: SpecEntry[], key: string): SpecEntry | undefined {
  return entries.find(e => e.path.split('/').pop() === key)
}

export function getQuestionTitle (entries: SpecEntry[], key: string): string {
  return findSpecEntryByKey(entries, key)?.spec?.title ?? key
}

export function getAnswerLabel (entries: SpecEntry[], qKey: string, aKey: string): string {
  const spec = findSpecEntryByKey(entries, qKey)?.spec
  return spec?.answers.find(a => a.key === aKey)?.label ?? aKey
}

export function getWafImpact (entries: SpecEntry[], qKey: string, aKey: string): WafPillarScores | undefined {
  const spec = findSpecEntryByKey(entries, qKey)?.spec
  return spec?.answers.find(a => a.key === aKey)?.waf_impact
}

export function getWafBaseline (entries: SpecEntry[], qKey: string, aKey: string): WafPillarScores | undefined {
  const spec = findSpecEntryByKey(entries, qKey)?.spec
  return spec?.answers.find(a => a.key === aKey)?.waf_baseline
}
