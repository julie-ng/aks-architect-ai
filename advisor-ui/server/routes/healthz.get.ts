import { sql } from 'drizzle-orm'

const startTime = Date.now()
const CHECK_INTERVAL_MS = 15 * 60 * 1000

interface Check {
  status: string
  output?: string
}

let postgresCheck: Check = { status: 'unknown' }
let postgresCheckedAt = 0

let retrievalApiCheck: Check = { status: 'unknown' }
let retrievalApiCheckedAt = 0

let ollamaCheck: Check = { status: 'unknown' }
let ollamaCheckedAt = 0

async function checkPostgres (): Promise<Check> {
  if (Date.now() - postgresCheckedAt < CHECK_INTERVAL_MS) {
    return postgresCheck
  }

  try {
    await db().execute(sql`SELECT 1`)
    postgresCheck = { status: 'pass' }
  }
  catch (err) {
    postgresCheck = { status: 'fail', output: err instanceof Error ? err.message : String(err) }
  }
  postgresCheckedAt = Date.now()
  return postgresCheck
}

async function checkRetrievalApi (): Promise<Check> {
  if (Date.now() - retrievalApiCheckedAt < CHECK_INTERVAL_MS) {
    return retrievalApiCheck
  }

  const config = useRuntimeConfig()
  try {
    const res = await $fetch<{ status: string }>(`${config.retrievalApiHost}/healthz`)
    retrievalApiCheck = res.status === 'pass'
      ? { status: 'pass' }
      : { status: 'fail', output: `upstream status=${res.status}` }
  }
  catch (err) {
    retrievalApiCheck = { status: 'fail', output: err instanceof Error ? err.message : String(err) }
  }
  retrievalApiCheckedAt = Date.now()
  return retrievalApiCheck
}

async function checkOllama (): Promise<Check> {
  if (Date.now() - ollamaCheckedAt < CHECK_INTERVAL_MS) {
    return ollamaCheck
  }

  const config = useRuntimeConfig()
  try {
    await checkOllamaModel(config.ai.ollamaBaseUrl, config.ai.chatModel)
    ollamaCheck = { status: 'pass' }
  }
  catch (err) {
    ollamaCheck = { status: 'fail', output: err instanceof Error ? err.message : String(err) }
  }
  ollamaCheckedAt = Date.now()
  return ollamaCheck
}

function formatUptime (ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return {
    component_type: 'system',
    observed_value: totalSeconds,
    human_readable: `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`,
    observed_unit: 's',
    time: new Date().toISOString().replace('+00:00', 'Z'),
  }
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const checks: Record<string, Check> = {
    postgres: await checkPostgres(),
    'retrieval-api': await checkRetrievalApi(),
  }

  if (config.ai.provider === 'ollama') {
    checks.ollama = await checkOllama()
  }
  const status = Object.values(checks).every(c => c.status === 'pass') ? 'pass' : 'fail'

  return {
    name: 'advisor-ui',
    status,
    env: {
      APP_ENVIRONMENT: config.appEnvironment,
      AI_PROVIDER: config.ai.provider,
      AI_CHAT_MODEL: config.ai.chatModel,
      AI_LLM_XS_MODEL: config.ai.llmXsModel,
    },
    uptime: formatUptime(Date.now() - startTime),
    checks,
  }
})
