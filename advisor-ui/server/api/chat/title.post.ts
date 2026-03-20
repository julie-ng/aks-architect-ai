const TITLE_PROMPT = [
  'Distill the topic of the user\'s message into a short chat title (5 words max).',
  'Return ONLY the title, nothing else. No quotes, no punctuation at the end.',
].join(' ')

interface OllamaChatResponse {
  message: { content: string }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { question } = await readBody<{ question: string }>(event)

  if (!question?.trim()) {
    throw createError({ statusCode: 400, message: 'question is required' })
  }

  const response = await $fetch<OllamaChatResponse>(
    `${config.ollamaHost}/api/chat`,
    {
      method: 'POST',
      body: {
        model: config.chatModel,
        stream: false,
        options: { temperature: 0.1 },
        messages: [
          { role: 'system', content: TITLE_PROMPT },
          { role: 'user', content: question },
        ],
      },
    },
  )

  const title = response.message.content.trim().replace(/\.+$/, '')

  return { title }
})
