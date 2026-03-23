import pino from 'pino'

const config = useRuntimeConfig()

export const logger = pino({
  level: config.appEnvironment === 'production' ? 'info' : 'debug',
})
