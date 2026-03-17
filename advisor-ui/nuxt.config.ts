// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/ui', '@nuxtjs/mdc', '@nuxt/eslint', '@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      titleTemplate: '%s | AKS Architect',
    },
  },
  devtools: { enabled: true },
  runtimeConfig: {
    appEnvironment: 'production',
    advisorApiUrl: 'http://localhost:8000',
    ollamaBaseUrl: 'http://localhost:11434',
    chatModel: 'gemma3:1b',
    provider: 'ollama',
    azureApiKey: '',
    azureEndpoint: '',
    azureDeployment: '',
  },
})
