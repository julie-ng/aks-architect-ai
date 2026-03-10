// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/ui'],
  devtools: { enabled: true },
  runtimeConfig: {
    advisorApiUrl: 'http://localhost:8000',
    ollamaBaseUrl: 'http://localhost:11434',
    chatModel: 'llama3.2',
    provider: 'ollama',
    azureApiKey: '',
    azureEndpoint: '',
    azureDeployment: '',
  },
})
