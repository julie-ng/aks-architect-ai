const startTime = Date.now()

// Cached advisor-api health check (refreshed every 15 minutes)
let lastCheckedAt = 0
const CHECK_INTERVAL_MS = 15 * 60 * 1000

interface Check {
  status: string
  output?: string
}

let advisorApiCheck: Check = { status: 'unknown' }

async function checkAdvisorApi (): Promise<Check> {
  const now = Date.now()
  if (now - lastCheckedAt < CHECK_INTERVAL_MS) {
    return advisorApiCheck
  }

  const config = useRuntimeConfig()
  try {
    const res = await $fetch<{ status: string }>(`${config.advisorApiHost}/healthz`)
    advisorApiCheck = res.status === 'pass'
      ? { status: 'pass' }
      : { status: 'fail', output: `upstream status=${res.status}` }
  }
  catch (err) {
    advisorApiCheck = { status: 'fail', output: err instanceof Error ? err.message : String(err) }
  }
  lastCheckedAt = now
  return advisorApiCheck
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
    'advisor-api': await checkAdvisorApi(),
  }
  const status = Object.values(checks).every(c => c.status === 'pass') ? 'pass' : 'fail'

  return {
    name: 'advisor-ui',
    status,
    env: { APP_ENVIRONMENT: config.appEnvironment },
    uptime: formatUptime(Date.now() - startTime),
    checks,
  }
})
