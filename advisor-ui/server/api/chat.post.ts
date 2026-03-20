import type { UIMessage } from 'ai'
import { streamText, convertToModelMessages } from 'ai'
import { getChatModel } from '../utils/provider'
import { buildSystemPrompt } from '../utils/system-prompt'
import { formatContext, deduplicateChunks } from '../utils/retrieval'
import { checkOllamaModel } from '../utils/ollama'
import { handleChatError } from '../utils/errors'
import type { RetrieveResponse } from '../types/retrieval'

export default defineLazyEventHandler(async () => {
  return defineEventHandler(async (event) => {
    const config = useRuntimeConfig()

    try {
      const { messages, domains }: { messages: UIMessage[], domains?: string[] } = await readBody(event)

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

      const t0 = performance.now()

      console.time('[chat] retrieve')
      const retrieveResponse = await $fetch<RetrieveResponse>(
        `${config.retrievalApiHost}/api/retrieve`,
        {
          method: 'POST',
          body: { question, history },
        },
      )
      console.timeEnd('[chat] retrieve')

      console.time('[chat] systemPrompt')
      const dedupedChunks = deduplicateChunks(retrieveResponse.chunks)
      const context = formatContext(dedupedChunks)
      const systemPrompt = buildSystemPrompt(domains)
      const systemPromptWithContext = `${systemPrompt}\n\n<context>\n${context}\n</context>`
      console.timeEnd('[chat] systemPrompt')

      const modelMessages = await convertToModelMessages(messages)
      const reformulatedQuery = retrieveResponse.reformulated_query

      // Verify model is available before streaming (fast, avoids cryptic mid-stream errors)
      if (config.provider === 'ollama') {
        console.time('[chat] modelCheck')
        await checkOllamaModel(config.ollamaHost, config.chatModel)
        console.timeEnd('[chat] modelCheck')
      }

      let firstToken = true
      console.time('[chat] ttfb')
      const result = streamText({
        model: getChatModel(),
        temperature: config.chatTemperature,
        system: systemPromptWithContext,
        messages: modelMessages,
        onFinish: () => {
          const total = (performance.now() - t0).toFixed(0)
          console.timeEnd('[chat] streaming')
          console.log(`[chat] total: ${total}ms`)
        },
      })

      const sources = dedupedChunks.map(c => ({
        url: c.url,
        title: c.title,
      }))

      return result.toUIMessageStreamResponse({
        messageMetadata: ({ part }) => {
          if (part.type === 'text-delta' && firstToken) {
            firstToken = false
            console.timeEnd('[chat] ttfb')
            console.time('[chat] streaming')
          }
          if (part.type === 'finish') {
            return { reformulatedQuery, sources }
          }
        },
      })
    }
    catch (err: unknown) {
      handleChatError(err, config)
    }
  })
})
