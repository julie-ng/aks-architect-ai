import type { UIMessage } from 'ai'

/**
 * Extracts source metadata from a chat message's metadata field.
 */
export function getSourcesMeta (message: UIMessage): SourceMeta[] {
  const meta = message.metadata as Record<string, unknown> | undefined
  return (meta?.sources ?? []) as SourceMeta[]
}
