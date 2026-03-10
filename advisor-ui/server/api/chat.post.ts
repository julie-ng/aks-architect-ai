import { streamText } from 'ai'
import { getChatModel } from '../utils/provider'
import { getSystemPrompt } from '../utils/system-prompt'

interface RetrieveChunk {
  title: string
  url: string
  score: number
  text: string
}

interface RetrieveResponse {
  chunks: RetrieveChunk[]
  reformulated_query: string
}

function formatContext(chunks: RetrieveChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] ${c.title}\nURL: ${c.url}\n${c.text}`)
    .join('\n\n---\n\n')
}

function extractText(message: { parts?: { type: string; text?: string }[]; content?: string }): string {
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text ?? '')
      .join('')
  }
  return message.content ?? ''
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { messages } = await readBody(event)

  const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
  if (!lastUserMessage) {
    throw createError({ statusCode: 400, message: 'No user message found' })
  }

  const question = extractText(lastUserMessage)

  const retrieveResponse = await $fetch<RetrieveResponse>(
    `${config.advisorApiUrl}/api/retrieve`,
    {
      method: 'POST',
      body: { question },
    },
  )

  const context = formatContext(retrieveResponse.chunks)
  const systemPrompt = getSystemPrompt()

  const augmentedMessages = [
    ...messages.slice(0, -1),
    {
      role: 'user' as const,
      content: `Documentation sources:\n\n${context}\n\n---\n\nQuestion: ${question}`,
    },
  ]

  const result = streamText({
    model: getChatModel(),
    system: systemPrompt,
    messages: augmentedMessages,
  })

  return result.toUIMessageStreamResponse()
})
