type SpecAnswer = {
  key: string
  label?: string
  description?: string
}

type SpecEntry = {
  path: string
  title: string
  spec: {
    title: string
    question?: string
    question_type: 'radio' | 'checkbox'
    answers: SpecAnswer[]
  }
}

export async function useSpecSchema (collection: 'requirements' | 'components') {
  const entries = await queryCollection(collection)
    .select('path', 'title', 'spec')
    .all() as unknown as SpecEntry[]

  function _findByKey (key: string): SpecEntry | undefined {
    return entries.find(e => e.path.split('/').pop() === key)
  }

  function getQuestionTitle (key: string): string {
    const entry = _findByKey(key)
    return entry?.spec?.title ?? key
  }

  function getAnswerLabel (qKey: string, aKey: string): string {
    const spec = _findByKey(qKey)?.spec
    return spec?.answers.find(a => a.key === aKey)?.label ?? aKey
  }

  return { getQuestionTitle, getAnswerLabel }
}
