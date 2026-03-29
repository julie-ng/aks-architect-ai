/**
 * Assembles the full system prompt from base prompt, RAG context, and optional design context.
 * Wraps each section in XML-style tags for clear LLM separation.
 *
 * @param systemPrompt - Base system prompt (from content/system-prompt/ directory)
 * @param ragContext - Formatted RAG retrieval chunks
 * @param designContext - Optional formatted design requirements + decisions
 * @param designChanged - Whether the design was updated since the last message
 * @returns Complete system prompt string
 */
export function assembleSystemPrompt (
  systemPrompt: string,
  ragContext: string,
  designContext?: string,
  designChanged?: boolean,
): string {
  let prompt = `${systemPrompt}\n\n<context>\n${ragContext}\n</context>`
  if (designContext) {
    prompt += `\n\n<design>\nThe user has an AKS architecture design with these choices. Tailor your advice to their specific configuration:\n${designContext}\n</design>`
  }
  if (designContext && designChanged) {
    prompt += `\n\n<design-change>\nIMPORTANT: The user's architecture design was updated since the last message.\nACTION REQUIRED: Call getDesignSnapshot NOW, before writing any text.\n</design-change>`
  }
  return prompt
}
