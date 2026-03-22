import type { RetrieveResponse } from '../../types/retrieval'

export default defineEventHandler(async (event) => {
  await requireUserId(event)
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
