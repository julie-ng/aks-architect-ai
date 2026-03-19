import { buildSystemPrompt } from '../../utils/system-prompt'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  if (config.appEnvironment !== 'development') {
    throw createError({ statusCode: 404, message: 'Not Found' })
  }

  const query = getQuery(event)
  const domains = typeof query.domains === 'string'
    ? query.domains.split(',').map(d => d.trim()).filter(Boolean)
    : undefined

  const prompt = buildSystemPrompt(domains)

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return prompt
})
