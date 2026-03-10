import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let cached: string | null = null

export function getSystemPrompt(): string {
  if (!cached) {
    const path = resolve(process.cwd(), '..', 'system-prompt.txt')
    cached = readFileSync(path, 'utf-8').trim()
  }
  return cached
}
