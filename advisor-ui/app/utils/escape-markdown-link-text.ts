/**
 * Escapes characters that have special meaning in markdown link text.
 */
export function escapeMarkdownLinkText (text: string): string {
  return text.replace(/[[\]()]/g, '\\$&')
}
