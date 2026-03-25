import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import jsYaml from 'js-yaml'

function parseFrontmatter (filePath: string): Record<string, unknown> {
  const raw = readFileSync(filePath, 'utf-8')
  const match = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!match) throw new Error(`No frontmatter found in ${filePath}`)
  return jsYaml.load(match[1]) as Record<string, unknown>
}

function getMarkdownFiles (dir: string): string[] {
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => join(dir, f))
}

const decisionsDir = join(__dirname, 'decisions')
const requirementsDir = join(__dirname, 'requirements')

const decisionFiles = getMarkdownFiles(decisionsDir)
const requirementFiles = getMarkdownFiles(requirementsDir)

describe('decisions frontmatter', () => {
  it.each(decisionFiles)('%s', (filePath) => {
    const data = parseFrontmatter(filePath)
    const spec = data.spec as Record<string, unknown>

    expect(spec).toBeDefined()
    expect(typeof spec.title).toBe('string')
    expect(typeof spec.question).toBe('string')
    expect(['radio', 'checkbox', 'text']).toContain(spec.question_type)

    const answers = spec.answers as Record<string, unknown>[]
    expect(Array.isArray(answers)).toBe(true)
    expect(answers.length).toBeGreaterThan(0)

    for (const answer of answers) {
      expect(typeof answer.key).toBe('string')
      expect(typeof answer.label).toBe('string')

      // Components use waf_impact, never waf_baseline or waf_requirements
      expect(answer).not.toHaveProperty('waf_baseline')
      expect(answer).not.toHaveProperty('waf_requirements')

      if (answer.waf_impact) {
        const impact = answer.waf_impact as Record<string, unknown>
        for (const val of Object.values(impact)) {
          expect(typeof val).toBe('number')
        }
      }
    }
  })
})

describe('requirements frontmatter', () => {
  it.each(requirementFiles)('%s', (filePath) => {
    const data = parseFrontmatter(filePath)
    const spec = data.spec as Record<string, unknown>

    expect(spec).toBeDefined()
    expect(typeof spec.title).toBe('string')
    expect(typeof spec.question).toBe('string')
    expect(['radio', 'checkbox']).toContain(spec.question_type)

    const answers = spec.answers as Record<string, unknown>[]
    expect(Array.isArray(answers)).toBe(true)
    expect(answers.length).toBeGreaterThan(0)

    for (const answer of answers) {
      expect(typeof answer.key).toBe('string')
      expect(typeof answer.label).toBe('string')

      // Requirements use waf_baseline, never waf_impact or waf_requirements
      expect(answer).not.toHaveProperty('waf_impact')
      expect(answer).not.toHaveProperty('waf_requirements')

      if (answer.waf_baseline) {
        const baseline = answer.waf_baseline as Record<string, unknown>
        for (const val of Object.values(baseline)) {
          expect(typeof val).toBe('number')
        }
      }
    }
  })
})
