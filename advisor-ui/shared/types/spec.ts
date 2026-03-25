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
  waf_impact?: WafPillarScores
  waf_baseline?: WafPillarScores
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
