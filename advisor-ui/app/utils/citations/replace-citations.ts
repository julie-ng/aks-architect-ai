import { citationClasses } from './citation-config'
import { shortenTitle } from './shorten-title'

export interface SourceMeta {
  url: string
  title: string
}

/**
 * Returns the CSS class string for a citation link based on URL hostname.
 * Reads from citationClasses config so classes are centrally configurable.
 */
export function getCitationClass (url: string): string {
  try {
    const hostname = new URL(url).hostname
    for (const [domain, cls] of Object.entries(citationClasses.domains)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return `${citationClasses.base} ${cls}`
      }
    }
  }
  catch {
    // Invalid URL — fall through to fallback
  }
  return `${citationClasses.base} ${citationClasses.fallback}`
}

/**
 * Escapes characters that have special meaning in markdown link text.
 */
function escapeMarkdownLinkText (text: string): string {
  return text.replace(/[[\]()]/g, '\\$&')
}

/**
 * Replaces `[1]`, `[2]`, etc. citation markers in text with MDC-attributed
 * markdown links using the corresponding source metadata.
 *
 * Code blocks (fenced and inline) are protected from replacement.
 */
export function replaceCitations (text: string, sources: SourceMeta[]): string {
  if (!sources.length) return text

  // Protect code blocks from replacement
  const PLACEHOLDER_PREFIX = '%%CODEBLOCK_'
  const PLACEHOLDER_SUFFIX = '%%'
  const placeholders: string[] = []

  let protectedText = text

  // Fenced code blocks (``` or ~~~)
  protectedText = protectedText.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, (match) => {
    placeholders.push(match)
    return `${PLACEHOLDER_PREFIX}${placeholders.length - 1}${PLACEHOLDER_SUFFIX}`
  })

  // Inline code
  protectedText = protectedText.replace(/`[^`]+`/g, (match) => {
    placeholders.push(match)
    return `${PLACEHOLDER_PREFIX}${placeholders.length - 1}${PLACEHOLDER_SUFFIX}`
  })

  // Replace citation markers
  const result = protectedText.replace(/\[(\d+)\]/g, (original, num) => {
    const index = parseInt(num, 10) - 1
    if (index < 0 || index >= sources.length) return original

    const source = sources[index]
    const title = escapeMarkdownLinkText(shortenTitle(source.title || 'Source'))
    const classes = getCitationClass(source.url)
    return `[${title}](${source.url}){.${classes.split(' ').join(' .')}}`
  })

  // Restore code blocks
  const restorePattern = new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, 'g')
  return result.replace(restorePattern, (_, i) => placeholders[parseInt(i, 10)])
}
