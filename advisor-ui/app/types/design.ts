export interface Design {
  id: string
  title: string
  description: string | null
  requirements: Record<string, string | string[]>
  decisions: Record<string, string | string[]>
  createdAt: string
  updatedAt: string
}
