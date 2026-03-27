import type { UIMessage } from 'ai'
import { streamText, convertToModelMessages } from 'ai'

/**
 * POST /api/chat-v2 — Minimal streaming chat endpoint.
 * No RAG, no tools, no design context. Just LLM streaming for debugging.
 */
export default defineEventHandler(async (event) => {
  await requireUserId(event)

  const { messages }: { messages: UIMessage[] } = await readBody(event)

  const result = streamText({
    model: getChatModel(),
    system: 'You are a helpful assistant specializing in Azure Kubernetes Service (AKS).',
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
})
