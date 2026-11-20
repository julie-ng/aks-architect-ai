import { describe, it, expect } from 'vitest'
import type { SpecEntry } from '~~/shared/types/spec'
import {
  findSpecEntryByKey,
  getAnswerLabel,
  getQuestionTitle,
  getWafBaseline,
  getWafImpact,
} from './spec-helpers'

const entries: SpecEntry[] = [
  {
    path: 'requirements/networking',
    title: 'Networking',
    spec: {
      title: 'Networking Choices',
      question_type: 'radio',
      answers: [
        {
          key: 'public',
          label: 'Public Network',
          waf_impact: { security: 2 },
          waf_baseline: { security: 1 },
        },
        { key: 'private' },
      ],
    },
  },
  {
    path: 'decisions/identity',
    title: 'Identity',
    spec: {
      title: 'Identity Provider',
      question_type: 'checkbox',
      answers: [
        { key: 'aad', label: 'Azure AD' },
      ],
    },
  },
]

describe('findSpecEntryByKey', () => {
  it('returns a matching entry by the last path segment', () => {
    expect(findSpecEntryByKey(entries, 'networking')).toEqual(entries[0])
  })

  it('returns undefined when no entry matches', () => {
    expect(findSpecEntryByKey(entries, 'missing')).toBeUndefined()
  })
})

describe('getQuestionTitle', () => {
  it('returns the spec title for a matching entry', () => {
    expect(getQuestionTitle(entries, 'identity')).toBe('Identity Provider')
  })

  it('returns the key when the entry is missing', () => {
    expect(getQuestionTitle(entries, 'missing-key')).toBe('missing-key')
  })
})

describe('getAnswerLabel', () => {
  it('returns the label for a matching answer', () => {
    expect(getAnswerLabel(entries, 'networking', 'public')).toBe('Public Network')
  })

  it('returns the answer key when the label is missing', () => {
    expect(getAnswerLabel(entries, 'networking', 'private')).toBe('private')
  })

  it('returns the answer key when the question is missing', () => {
    expect(getAnswerLabel(entries, 'missing-question', 'answer')).toBe('answer')
  })
})

describe('getWafImpact', () => {
  it('returns waf impact when available', () => {
    expect(getWafImpact(entries, 'networking', 'public')).toEqual({ security: 2 })
  })

  it('returns undefined when the answer is missing', () => {
    expect(getWafImpact(entries, 'networking', 'missing')).toBeUndefined()
  })
})

describe('getWafBaseline', () => {
  it('returns waf baseline when available', () => {
    expect(getWafBaseline(entries, 'networking', 'public')).toEqual({ security: 1 })
  })

  it('returns undefined when the question is missing', () => {
    expect(getWafBaseline(entries, 'missing-question', 'public')).toBeUndefined()
  })
})
