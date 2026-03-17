import { streamText, UIMessage, convertToModelMessages } from 'ai'
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

export default defineLazyEventHandler(async () => {
  return defineEventHandler(async (event) => {
    const config = useRuntimeConfig()

    try {
      const { messages }: { messages: UIMessage[] } = await readBody(event)

      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
      if (!lastUserMessage) {
        throw createError({ statusCode: 400, message: 'No user message found' })
      }

      const question = lastUserMessage.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''

      // Build recent conversation history for context-aware query reformulation
      const history = messages
        .filter((m) => m !== lastUserMessage)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.parts?.filter((p) => p.type === 'text').map((p) => p.text).join('') ?? '',
        }))
        .filter((m) => m.content.length > 0)
        .slice(-6)

      const retrieveResponse = await $fetch<RetrieveResponse>(
        `${config.advisorApiUrl}/api/retrieve`,
        {
          method: 'POST',
          body: { question, history },
        },
      )

      const context = formatContext(retrieveResponse.chunks)
      const systemPrompt = getSystemPrompt()

      const modelMessages = await convertToModelMessages(messages)
      // Replace last user message with augmented version including RAG context
      modelMessages[modelMessages.length - 1] = {
        role: 'user' as const,
        content: `Documentation sources:\n\n${context}\n\n---\n\nQuestion: ${question}`,
      }

      const reformulatedQuery = retrieveResponse.reformulated_query

      const result = streamText({
        model: getChatModel(),
        system: systemPrompt,
        messages: modelMessages,
      })

      return result.toUIMessageStreamResponse({
        messageMetadata: ({ part }) => {
          if (part.type === 'finish') {
            return { reformulatedQuery }
          }
        },
      })
    }
    catch (err: unknown) {
      // Re-throw errors already created with createError (e.g. 400 validation)
      if (err && typeof err === 'object' && 'statusCode' in err) {
        throw err
      }

      const isDev = config.appEnvironment === 'development'
      throw createError({
        statusCode: 500,
        message: 'Internal Server Error',
        ...(isDev && { stack: err instanceof Error ? err.stack : String(err) }),
      })
    }
  })
})
