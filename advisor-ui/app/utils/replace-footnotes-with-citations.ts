export interface SourceMeta {
  url: string
  title: string
}

/**
 * Returns the CSS class string for a citation link based on URL hostname.
 * Reads from app config so classes are centrally configurable.
 */
function getCitationClass (url: string): string {
  const config = useAppConfig().citations

  try {
    const hostname = new URL(url).hostname
    for (const [domain, cls] of Object.entries(config.domains)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return `${config.base} ${cls}`
      }
    }
  }
  catch {
    // Invalid URL — fall through to fallback
  }
  return `${config.base} ${config.fallback}`
}

/**
 * Replaces `[1]`, `[2]`, etc. citation markers in text with MDC-attributed
 * markdown links using the corresponding source metadata.
 *
 * Code blocks (fenced and inline) are protected from replacement.
 */
export function replaceFootnotesWithCitations (text: string, sources: SourceMeta[]): string {
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
    const title = escapeMarkdownLinkText(shortenCitationTitle(source.title || 'Source'))
    const classes = getCitationClass(source.url)
    return `[${title}](${source.url}){.${classes.split(' ').join(' .')}}`
  })

  // Restore code blocks
  const restorePattern = new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, 'g')
  return result.replace(restorePattern, (_, i) => placeholders[parseInt(i, 10)])
}
