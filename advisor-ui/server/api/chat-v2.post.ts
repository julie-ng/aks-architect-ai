import type { UIMessage } from 'ai'
import { streamText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import type { RetrieveResponse } from '../types/retrieval'

/**
 * POST /api/chat-v2 — Streaming chat with RAG retrieval + optional design context.
 * Uses createUIMessageStream so the client sees indicator dots immediately
 * while retrieval + reformulation happen inside execute().
 *
 * @returns Streaming response via AI SDK's UI message stream protocol
 */
export default defineEventHandler(async (event) => {
  await requireUserId(event)
  const config = useRuntimeConfig()

  try {
    const { messages, designId }: {
      messages: UIMessage[]
      designId?: string
    } = await readBody(event)

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

        const history = extractConversationHistory(messages, lastUserMessage)

        // --- RAG retrieval (client already sees indicator dots) ---
        console.time('[chat-v2] retrieve')
        const retrieveResponse = await $fetch<RetrieveResponse>(
          `${config.retrievalApiHost}/api/retrieve`,
          {
            method: 'POST',
            body: {
              question,
              history,
              ...(designId
                ? { design_id: designId }
                : {}
              ),
            },
          },
        )
        console.timeEnd('[chat-v2] retrieve')
        console.log('[chat-v2] reformulated:', retrieveResponse.reformulated_query)

        // --- Fetch design context if linked ---
        const designContext = designId
          ? await fetchDesignContext(designId)
          : ''

        // --- Assemble system prompt ---
        const dedupedChunks = deduplicateChunks(retrieveResponse.chunks)
        const ragContext = formatContext(dedupedChunks)
        const fullPrompt = assembleSystemPrompt(
          buildSystemPrompt(),
          ragContext,
          designContext,
        )

        // --- Extract sources for client-side citation rendering ---
        const sources = dedupedChunks.map(c => ({
          url: c.url,
          title: c.title,
        }))

        // --- Stream LLM response ---
        const result = streamText({
          model: getChatModel(),
          temperature: config.ai.chatTemperature,
          system: fullPrompt,
          messages: await convertToModelMessages(messages),
        })

        // Attach sources as message metadata so the client can render citations
        writer.merge(result.toUIMessageStream({
          messageMetadata: ({ part }) => {
            if (part.type === 'start') {
              return { sources }
            }
          },
        }))
      },
    })

    return createUIMessageStreamResponse({ stream })
  }
  catch (err: unknown) {
    handleChatError(err, config)
  }
})
