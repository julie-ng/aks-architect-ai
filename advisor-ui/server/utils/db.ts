import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

let instance: ReturnType<typeof drizzle> | null = null

/**
 * Whether the connection targets AWS RDS, which requires SSL. RDS's default
 * pg_hba.conf only accepts encrypted connections, so postgres.js (which connects
 * plaintext by default, unlike psycopg) is rejected with a "no encryption" auth
 * error unless SSL is enabled. The local pgvector container needs no SSL.
 *
 * @param databaseUrl - The Postgres connection string
 * @returns True if the host is an AWS RDS endpoint
 */
function _needsSsl (databaseUrl: string): boolean {
  return /\.rds\.amazonaws\.com\b/.test(databaseUrl)
}

/**
 * Returns a singleton Drizzle ORM instance backed by postgres.js.
 *
 * @returns The shared Drizzle ORM instance
 */
export function db () {
  if (!instance) {
    const config = useRuntimeConfig()
    const client = postgres(config.databaseUrl, {
      max: 10,
      idle_timeout: 20,
      // rejectUnauthorized: false accepts RDS's AWS CA without shipping the cert
      // bundle — fine for a demo. Omit ssl entirely for the local container.
      ...(_needsSsl(config.databaseUrl)
        ? { ssl: { rejectUnauthorized: false } }
        : {}
      ),
    })
    instance = drizzle({ client, schema })
  }
  return instance
}
