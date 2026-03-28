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
  content: {
    renderer: {
      anchorLinks: false // Disables anchor links globally
    }
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      titleTemplate: '%s | AKS Architect',
    },
  },
  devtools: { enabled: true },
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'ai',
        '@ai-sdk/vue',
        '@shikijs/engine-oniguruma',
        '@shikijs/engine-javascript',
        '@shikijs/core',
        '@shikijs/transformers',
        '@shikijs/langs/javascript',
        '@shikijs/langs/jsx',
        '@shikijs/langs/json',
        '@shikijs/langs/typescript',
        '@shikijs/langs/tsx',
        '@shikijs/langs/vue',
        '@shikijs/langs/css',
        '@shikijs/langs/html',
        '@shikijs/langs/shellscript',
        '@shikijs/langs/markdown',
        '@shikijs/langs/mdc',
        '@shikijs/langs/yaml',
        '@shikijs/themes/material-theme-lighter',
        '@shikijs/themes/material-theme',
        '@shikijs/themes/material-theme-palenight',
        'shiki/wasm',
      ],
    },
  },
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
