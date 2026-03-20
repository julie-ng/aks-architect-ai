// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: [
    '@pinia/nuxt',
    '@nuxt/ui',
    '@nuxtjs/mdc',
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/content',
  ],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      titleTemplate: '%s | AKS Architect',
    },
  },
  devtools: { enabled: true },
  runtimeConfig: {
    appEnvironment: 'production',
    retrievalApiHost: 'http://localhost:8000',
    ollamaHost: 'http://localhost:11434',
    chatModel: 'gemma3:1b',
    chatTemperature: 0.3,
    provider: 'ollama',
    azureApiKey: '',
    azureEndpoint: '',
    azureDeployment: '',
  },
})