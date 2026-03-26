import anthropic
import ollama

REFORMULATION_PROMPT = """\
You are a search query optimizer for Azure Kubernetes Service (AKS) documentation. \
Rewrite the user's question into a better search query for semantic retrieval.

Rules:
- If conversation history is provided, resolve references and pronouns so the query is fully standalone
- Expand abbreviations (e.g. "k8s" → "Kubernetes", "NSG" → "network security group")
- Add relevant technical terms the docs likely use
- Remove conversational filler ("how do I", "can you help me", etc.)
- Return ONLY the rewritten query, nothing else
- Keep it concise (1-2 sentences max)
"""


def reformulate_query(
    question: str,
    model: str,
    history: list[dict[str, str]] | None = None,
    temperature: float = 0.1,
    design_context: str | None = None,
    provider: str = "ollama",
) -> str:
    """Rewrite a user question into a better retrieval query.

    When conversation history is provided, resolves references and pronouns
    so the query is standalone (e.g. "What about multi-region?" after an
    AKS networking question becomes "AKS networking for multi-region deployments").
    """
    try:
        system_content = REFORMULATION_PROMPT
        if design_context:
            system_content += (
                "\n\nThe user has an AKS architecture design. Use it to make the search query "
                "more specific and relevant.\n"
                "- Requirements describe their business constraints (SLA, compliance, regions, etc.)\n"
                "- Architectural Decisions describe their chosen technologies and configurations\n\n"
                f"{design_context}"
            )

        messages: list[dict[str, str]] = []
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": question})

        if provider == "anthropic":
            client = anthropic.Anthropic()
            response = client.messages.create(
                model=model,
                system=system_content,
                messages=messages,
                temperature=temperature,
                max_tokens=256,
            )
            return response.content[0].text.strip()
        else:
            ollama_messages: list[dict[str, str]] = [
                {"role": "system", "content": system_content},
                *messages,
            ]
            response = ollama.chat(model=model, messages=ollama_messages, options={"temperature": temperature})
            return response["message"]["content"].strip()
    except Exception:
        return question
