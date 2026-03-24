export type DesignerAnswer = {
  key: string
  label?: string
  title?: string
  description?: string
  highlights?: string[]
  highglights?: string[]
  disabled?: boolean
  tag?: {
    text: string
    color?: string
    variant?: string
  }
  waf_impact?: WafImpact
}

export type WafImpact = {
  reliability?: number
  security?: number
  cost?: number
  operations?: number
  performance?: number
}

export type DesignerQuestion = {
  id: string
  title?: string
  description?: string
  question?: string
  question_type?: string
  answers?: DesignerAnswer[]
}
