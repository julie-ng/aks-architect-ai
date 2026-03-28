/**
 * Assembles the full system prompt from base prompt, RAG context, and optional design context.
 * Wraps each section in XML-style tags for clear LLM separation.
 *
 * @param systemPrompt - Base system prompt (from content/system-prompt/ directory)
 * @param ragContext - Formatted RAG retrieval chunks
 * @param designContext - Optional formatted design requirements + decisions
 * @returns Complete system prompt string
 */
export function assembleSystemPrompt (
  systemPrompt: string,
  ragContext: string,
  designContext?: string,
): string {
  let prompt = `${systemPrompt}\n\n<context>\n${ragContext}\n</context>`
  if (designContext) {
    prompt += `\n\n<design>\nThe user has an AKS architecture design with these choices. Tailor your advice to their specific configuration:\n${designContext}\n</design>`
  }
  return prompt
}
