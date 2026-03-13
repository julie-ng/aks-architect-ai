export interface RetrieveChunk {
  id: string
  title: string
  url: string
  score: number
  boosted_score: number
  text: string
  tags: Record<string, string | string[]>
  priority: number | null
}

export interface RetrieveResponse {
  chunks: RetrieveChunk[]
  reformulated_query: string
}
