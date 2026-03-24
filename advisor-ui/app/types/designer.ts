export type DesignerAnswer = {
  key: string
  label?: string
  title?: string
  description?: string
  highlights?: string[]
  highglights?: string[]
  disabled?: boolean
}

export type DesignerQuestion = {
  id: string
  title?: string
  description?: string
  question?: string
  question_type?: string
  answers?: DesignerAnswer[]
}
