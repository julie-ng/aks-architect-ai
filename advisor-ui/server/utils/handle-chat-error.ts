import { APICallError } from '@ai-sdk/provider'

interface ChatErrorConfig {
  ai: { provider: string, ollamaBaseUrl: string }
  retrievalApiHost: string
  appEnvironment: string
}

/**
 * Maps raw errors from the chat pipeline into user-friendly Nitro errors.
 * Handles AI SDK provider errors, retrieval API failures, and unknown errors.
 * Always throws — never returns.
 */
export function handleChatError (err: unknown, config: ChatErrorConfig): never {
  // Re-throw errors already created with createError (e.g. 400 validation, pre-flight checks)
  if (err && typeof err === 'object' && 'statusCode' in err) {
    throw err
  }

  // LLM provider errors that slip through streaming
  if (APICallError.isInstance(err)) {
    const host = config.ai.ollamaBaseUrl
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
