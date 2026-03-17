import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let cached: string | null = null

export function getSystemPrompt (): string {
  if (!cached) {
    const config = useRuntimeConfig()
    const path = resolve(process.cwd(), config.systemPromptPath)
    cached = readFileSync(path, 'utf-8').trim()
  }
  return cached
}
