import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

let instance: ReturnType<typeof drizzle> | null = null

/**
 * Returns a singleton Drizzle ORM instance backed by postgres.js.
 */
export function db () {
  if (!instance) {
    const config = useRuntimeConfig()
    const client = postgres(config.databaseUrl, { max: 10, idle_timeout: 20 })
    instance = drizzle({ client, schema })
  }
  return instance
}
