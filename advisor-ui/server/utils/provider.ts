import { createGateway } from 'ai'
import { createOllama } from 'ollama-ai-provider-v2'
import { createAnthropic } from '@ai-sdk/anthropic'

/**
 * Resolves the LLM provider from runtime config. Three options:
 * - `vercel`    — Vercel AI Gateway (prod). Better per-key spend controls +
 *                 observability. Model ids are `provider/model` (e.g.
 *                 `anthropic/claude-sonnet-4.6`). createGateway ships in `ai`.
 * - `anthropic` — direct to Anthropic. Model ids are bare (`claude-sonnet-4.6`).
 * - `ollama`    — local dev (default fallback).
 *
 * @returns A provider callable that maps a model id to a language model
 */
function getProvider () {
  const config = useRuntimeConfig()
  const { ai } = config

  if (ai.provider === 'vercel') {
    return createGateway({ apiKey: ai.gatewayApiKey })
  }
  else if (ai.provider === 'anthropic') {
    // Reuses gatewayApiKey as the direct Anthropic key — one key field for whichever
    // provider is active, rather than a separate env var per provider.
    return createAnthropic({ apiKey: ai.gatewayApiKey })
  }
  else {
    return createOllama({ baseURL: `${ai.ollamaBaseUrl}/api` })
  }
}

export function getChatModel () {
  const config = useRuntimeConfig()
  const provider = getProvider()
  return provider(config.ai.chatModel)
}

export function getTitleModel () {
  const config = useRuntimeConfig()
  const provider = getProvider()
  return provider(config.ai.llmXsModel)
}
