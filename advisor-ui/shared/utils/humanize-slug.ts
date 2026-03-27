/**
 * Converts a kebab-case slug to a human-readable Title Case string.
 * e.g. "enable-multi-az" → "Enable Multi Az"
 */
export function humanizeSlug (slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
