import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

interface PromptFile {
  domain: string | null
  body: string
}

const CONTENT_DIR = join(process.cwd(), 'content', 'system-prompt')
const DEFAULT_EXCLUDE_DOMAINS = ['scalability-and-storage']

function parseFrontmatter (raw: string): { domain: string | null, body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { domain: null, body: raw.trim() }

  const frontmatter = match[1]
  const body = match[2].trim()
  const domainMatch = frontmatter.match(/^domain:\s*(.+)$/m)
  return { domain: domainMatch ? domainMatch[1].trim() : null, body }
}

function loadPromptFiles (): PromptFile[] {
  const files = readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md') && f !== 'README.md')
  return files.map((filename) => {
    const raw = readFileSync(join(CONTENT_DIR, filename), 'utf-8')
    return parseFrontmatter(raw)
  })
}

export function getAvailableDomains (): string[] {
  return loadPromptFiles()
    .map(f => f.domain)
    .filter((d): d is string => d !== null)
}

export function getDefaultDomains (): string[] {
  return getAvailableDomains().filter(d => !DEFAULT_EXCLUDE_DOMAINS.includes(d))
}

export function buildSystemPrompt (domains?: string[]): string {
  const files = loadPromptFiles()
  const selectedDomains = domains ?? getDefaultDomains()

  const core = files.find(f => f.domain === null)
  if (!core) throw new Error('system-prompt-core.md not found')

  const knowledgeSections = files
    .filter(f => f.domain !== null && selectedDomains.includes(f.domain))
    .map(f => `<knowledge domain="${f.domain}">\n${f.body}\n</knowledge>`)

  return [core.body, ...knowledgeSections].join('\n\n')
}
