import { createOllama } from 'ollama-ai-provider'
import { createAzure } from '@ai-sdk/azure'

export function getChatModel() {
  const config = useRuntimeConfig()

  if (config.provider === 'azure') {
    const azure = createAzure({
      apiKey: config.azureApiKey,
      resourceName: config.azureEndpoint,
    })
    return azure(config.azureDeployment)
  }

  const ollama = createOllama({ baseURL: `${config.ollamaBaseUrl}/api` })
  return ollama(config.chatModel)
}
