import type { UIMessage } from 'ai'
import { streamText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import type { RetrieveResponse } from '../types/retrieval'

/**
 * POST /api/chat-v2 — Streaming chat with RAG retrieval.
 * Uses createUIMessageStream so the client sees indicator dots immediately
 * while retrieval + reformulation happen inside execute().
 *
 * @returns Streaming response via AI SDK's UI message stream protocol
 */
export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const config = useRuntimeConfig()

  const { messages }: { messages: UIMessage[] } = await readBody(event)

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // --- Extract question from last user message ---
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
      if (!lastUserMessage) {
        throw createError({ statusCode: 400, message: 'No user message found' })
      }

      const question = lastUserMessage.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''

      // --- Build recent history for context-aware reformulation ---
      const history = messages
        .filter((m) => m !== lastUserMessage)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.parts?.filter((p) => p.type === 'text').map((p) => p.text).join('') ?? '',
        }))
        .filter((m) => m.content.length > 0)
        .slice(-6)

      // --- RAG retrieval (client already sees indicator dots) ---
      console.time('[chat-v2] retrieve')
      const retrieveResponse = await $fetch<RetrieveResponse>(
        `${config.retrievalApiHost}/api/retrieve`,
        {
          method: 'POST',
          body: { question, history },
        },
      )
      console.timeEnd('[chat-v2] retrieve')
      console.log('[chat-v2] reformulated:', retrieveResponse.reformulated_query)

      // --- Build system prompt with RAG context ---
      const dedupedChunks = deduplicateChunks(retrieveResponse.chunks)
      const context = formatContext(dedupedChunks)
      const systemPrompt = buildSystemPrompt()
      const fullPrompt = `${systemPrompt}\n\n<context>\n${context}\n</context>`

      // --- Stream LLM response ---
      const result = streamText({
        model: getChatModel(),
        temperature: config.ai.chatTemperature,
        system: fullPrompt,
        messages: await convertToModelMessages(messages),
      })

      writer.merge(result.toUIMessageStream())
    },
  })

  return createUIMessageStreamResponse({ stream })
})
