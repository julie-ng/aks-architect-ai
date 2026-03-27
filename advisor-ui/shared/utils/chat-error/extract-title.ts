/**
 * Extracts a human-readable title from a JSON-encoded error message string.
 * Returns "statusCode statusMessage" if parseable, otherwise falls back to "Error".
 */
export function extractErrorTitle (message: string): string {
  try {
    const parsed = JSON.parse(message)
    if (parsed?.statusCode && parsed?.statusMessage) {
      return `${parsed.statusCode} ${parsed.statusMessage}`
    }
    return 'Error'
  }
  catch {
    return 'Error'
  }
}
