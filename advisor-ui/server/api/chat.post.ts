import type { UIMessage } from 'ai'
import { APICallError } from '@ai-sdk/provider'
import { streamText, convertToModelMessages } from 'ai'
import { getChatModel } from '../utils/provider'
import { buildSystemPrompt } from '../utils/system-prompt'

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

function formatContext (chunks: RetrieveChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] ${c.title}\nURL: ${c.url}\n${c.text}`)
    .join('\n\n---\n\n')
}

function deduplicateChunks (chunks: RetrieveChunk[]): RetrieveChunk[] {
  const seen = new Set<string>()
  return chunks.filter((c) => {
    if (seen.has(c.url)) return false
    seen.add(c.url)
    return true
  })
}

async function checkOllamaModel (host: string, model: string): Promise<void> {
  let res
  try {
    res = await $fetch.raw(`${host}/api/show`, {
      method: 'POST',
      body: { model },
      ignoreResponseError: true,
    })
  }
  catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'LLM host unreachable',
      data: { error: `Cannot connect to model at ${host}. Is it running?` },
    })
  }
  if (res.status === 404) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Model not found',
      data: { error: `Model "${model}" not found on ${host}.` },
    })
  }
  if (!res.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'LLM provider error',
      data: { error: `LLM provider returned ${res.status} at ${host}. Is it running?` },
    })
  }
}

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
      // Re-throw errors already created with createError (e.g. 400 validation, pre-flight checks)
      if (err && typeof err === 'object' && 'statusCode' in err) {
        throw err
      }

      // LLM provider errors that slip through streaming
      if (APICallError.isInstance(err)) {
        const host = config.provider === 'azure' ? config.azureEndpoint : config.ollamaHost
        throw createError({
          statusCode: 502,
          statusMessage: 'LLM provider error',
          data: { error: `Could not reach LLM provider at ${host} (${err.statusCode ?? 'connection failed'}). Is it running?` },
        })
      }

      // Retrieval API errors (e.g. retrieval-api or Qdrant down)
      if (err instanceof Error && err.message.includes('fetch')) {
        throw createError({
          statusCode: 502,
          statusMessage: 'Retrieval service unavailable',
          data: { error: `Could not reach retrieval-api at ${config.retrievalApiHost}. Is it running?` },
        })
      }

      const isDev = config.appEnvironment === 'development'
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        ...(isDev && { data: { error: err instanceof Error ? err.message : String(err) } }),
      })
    }
  })
})
