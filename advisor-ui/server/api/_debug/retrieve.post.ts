interface RetrieveChunk {
  id: string
  title: string
  url: string
  score: number
  boosted_score: number
  text: string
  tags: Record<string, string | string[]>
  priority: number | null
}

interface RetrieveResponse {
  chunks: RetrieveChunk[]
  reformulated_query: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { question } = await readBody<{ question: string }>(event)

  if (!question?.trim()) {
    throw createError({ statusCode: 400, message: 'Question is required' })
  }

  const response = await $fetch<RetrieveResponse>(
    `${config.retrievalApiHost}/api/retrieve`,
    {
      method: 'POST',
      body: { question },
    },
  )

  return response
})
