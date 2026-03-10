import ollama


REFORMULATION_PROMPT = """\
You are a search query optimizer for Azure Kubernetes Service (AKS) documentation. \
Rewrite the user's question into a better search query for semantic retrieval.

Rules:
- Expand abbreviations (e.g. "k8s" → "Kubernetes", "NSG" → "network security group")
- Add relevant technical terms the docs likely use
- Remove conversational filler ("how do I", "can you help me", etc.)
- Return ONLY the rewritten query, nothing else
- Keep it concise (1-2 sentences max)
"""


def reformulate_query(question: str, model: str) -> str:
    """Rewrite a user question into a better retrieval query."""
    try:
        response = ollama.chat(
            model=model,
            messages=[
                {"role": "system", "content": REFORMULATION_PROMPT},
                {"role": "user", "content": question},
            ],
        )
        return response["message"]["content"].strip()
    except Exception:
        return question
