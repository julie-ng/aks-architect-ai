/**
 * Extracts a descriptive error message from a JSON-encoded error message string.
 * Tries nested `data.error`, then `statusMessage`, then `message`, falling back to the raw string.
 */
export function extractErrorMessage (message: string): string {
  try {
    const parsed = JSON.parse(message)
    return parsed?.data?.error ?? parsed?.statusMessage ?? parsed?.message ?? message
  }
  catch {
    return message || 'An unexpected error occurred.'
  }
}
