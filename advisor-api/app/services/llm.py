import ollama


SYSTEM_PROMPT = """\
You are an expert Azure Kubernetes Service (AKS) architect. Answer the user's \
question using ONLY the provided documentation sources. If the sources don't \
contain enough information, say so clearly.

Guidelines:
- Cite sources by number (e.g. [1], [2]) when referencing specific information.
- Explain trade-offs when multiple approaches exist.
- Be specific and actionable — give concrete configuration guidance, not just concepts.
- If a recommendation depends on workload type or compliance requirements, say so.
"""


def _format_context(chunks: list[dict]) -> str:
    """Format retrieved chunks as numbered sources for the LLM prompt."""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(
            f"[{i}] {chunk['title']}\n"
            f"URL: {chunk['url']}\n"
            f"{chunk['text']}"
        )
    return "\n\n---\n\n".join(parts)


def generate_answer(question: str, chunks: list[dict], model: str) -> str:
    """Generate an answer from retrieved chunks using Ollama chat."""
    context = _format_context(chunks)

    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Documentation sources:\n\n{context}\n\n"
                    f"---\n\nQuestion: {question}"
                ),
            },
        ],
    )
    return response["message"]["content"]
