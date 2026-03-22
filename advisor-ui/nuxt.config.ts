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
    'nuxt-auth-utils',
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
    databaseUrl: '',
    retrievalApiHost: 'http://localhost:8000',
    ai: {
      provider: '',
      gatewayApiKey: '',
      chatModel: '',
      llmXsModel: '',
      chatTemperature: 0.3,
      ollamaBaseUrl: 'http://localhost:11434',
    },
  },
})
