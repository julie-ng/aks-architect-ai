import type { SpecEntry } from '~~/shared/types/spec'
import {
  getQuestionTitle as _getQuestionTitle,
  getAnswerLabel as _getAnswerLabel,
  getWafImpact as _getWafImpact,
  getWafBaseline as _getWafBaseline,
} from '~~/shared/utils/spec-helpers'

export async function useSpecSchema (collection: 'requirements' | 'components') {
  const entries = await queryCollection(collection)
    .select('path', 'title', 'spec')
    .all() as unknown as SpecEntry[]

  return {
    total: entries.length,
    getQuestionTitle: (key: string) => _getQuestionTitle(entries, key),
    getAnswerLabel: (qKey: string, aKey: string) => _getAnswerLabel(entries, qKey, aKey),
    getWafImpact: (qKey: string, aKey: string) => _getWafImpact(entries, qKey, aKey),
    getWafBaseline: (qKey: string, aKey: string) => _getWafBaseline(entries, qKey, aKey),
  }
}
