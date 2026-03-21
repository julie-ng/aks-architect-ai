import { createOllama } from 'ollama-ai-provider-v2'
import { createAnthropic } from '@ai-sdk/anthropic'

function getProvider () {
  const config = useRuntimeConfig()
  const { ai } = config

  if (ai.provider === 'anthropic') {
    return createAnthropic({ apiKey: ai.gatewayApiKey })
  }

  return createOllama({ baseURL: `${ai.ollamaBaseUrl}/api` })
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
