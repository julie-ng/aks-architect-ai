import type { UIMessage } from 'ai'
import { streamText, convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from 'ai'

/**
 * POST /api/chat-v2 — Streaming chat endpoint using createUIMessageStream.
 * Stream opens immediately so client sees indicator dots during processing.
 * No RAG or tools yet — ready for retrieval to be added inside execute().
 *
 * @returns Streaming response via AI SDK's UI message stream protocol
 */
export default defineEventHandler(async (event) => {
  await requireUserId(event)

  const { messages }: { messages: UIMessage[] } = await readBody(event)

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Stream is already open — client sees "streaming" status immediately.
      // RAG retrieval will go here (before streamText) so indicator dots
      // show during the retrieval wait instead of an empty bubble.

      const result = streamText({
        model: getChatModel(),
        system: 'You are a helpful assistant specializing in Azure Kubernetes Service (AKS).',
        messages: await convertToModelMessages(messages),
      })

      writer.merge(result.toUIMessageStream())
    },
  })

  return createUIMessageStreamResponse({ stream })
})
