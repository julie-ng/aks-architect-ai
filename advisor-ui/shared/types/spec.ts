export type WafPillarScores = {
  reliability?: number
  security?: number
  cost?: number
  operations?: number
  performance?: number
}

export type SpecAnswer = {
  key: string
  label?: string
  description?: string
  highlights?: string[]
  disabled?: boolean
  tag?: {
    text: string
    color?: string
    variant?: string
  }
  waf_impact?: WafPillarScores
  waf_baseline?: WafPillarScores
}

export type SpecQuestion = {
  id: string
  title?: string
  description?: string
  question?: string
  question_type?: string
  answers?: SpecAnswer[]
}

export type SpecEntry = {
  path: string
  title: string
  spec: {
    title: string
    question?: string
    question_type: 'radio' | 'checkbox'
    answers: SpecAnswer[]
  }
}
