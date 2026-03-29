/**
 * Assembles the full system prompt from base prompt, RAG context, and optional design context.
 * Wraps each section in XML-style tags for clear LLM separation.
 *
 * @param systemPrompt - Base system prompt (from content/system-prompt/ directory)
 * @param ragContext - Formatted RAG retrieval chunks
 * @param options - Optional design context, change detection flag, and framework schema
 * @returns Complete system prompt string
 */
export function assembleSystemPrompt (
  systemPrompt: string,
  ragContext: string,
  options?: {
    designContext?: string
    designChanged?: boolean
    frameworkSchema?: string
  },
): string {
  const { designContext, designChanged, frameworkSchema } = options ?? {}

  let prompt = `${systemPrompt}\n\n<context>\n${ragContext}\n</context>`
  if (designContext) {
    prompt += `\n\n<design>\nThe user has an AKS architecture design with these choices. Tailor your advice to their specific configuration:\n${designContext}\n</design>`
  }
  if (designContext && designChanged) {
    prompt += `\n\n<design-change>\nIMPORTANT: The user's architecture design was updated since the last message.\nACTION REQUIRED: Call getDesignSnapshot NOW, before writing any text.\n</design-change>`
  }
  if (frameworkSchema) {
    prompt += `\n\n<framework>\nThe following are valid design framework questions the user can answer.\nWhen the user expresses a preference that matches one of these, call proposeDesignUpdate with the exact key and value.\nOnly propose after confirming with the user.\n\n${frameworkSchema}\n</framework>`
  }
  return prompt
}
