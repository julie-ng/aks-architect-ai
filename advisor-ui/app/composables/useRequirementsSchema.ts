type RequirementAnswer = {
  key: string
  label?: string
  description?: string
}

type RequirementSpec = {
  title: string
  short_title?: string
  description?: string
  question_type: 'radio' | 'checkbox'
  answers: RequirementAnswer[]
}

type RequirementEntry = {
  path: string
  title: string
  spec: RequirementSpec
}

export async function useRequirementsSchema () {
  const entries = await queryCollection('requirements')
    .select('path', 'title', 'spec')
    .all() as unknown as RequirementEntry[]

  function _findByKey (key: string): RequirementEntry | undefined {
    return entries.find(req => req.path.split('/').pop() === key)
  }

  function getQuestionShortTitle (key: string): string {
    const entry = _findByKey(key)
    return entry?.spec?.short_title ?? entry?.spec?.title ?? key
  }

  function getAnswerLabel (qKey: string, aKey: string): string {
    const spec = _findByKey(qKey)?.spec
    return spec?.answers.find(a => a.key === aKey)?.label ?? aKey
  }

  return { getQuestionShortTitle, getAnswerLabel }
}
