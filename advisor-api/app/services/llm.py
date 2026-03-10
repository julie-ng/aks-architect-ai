from functools import lru_cache
from pathlib import Path

import ollama


@lru_cache
def _load_system_prompt(path: str) -> str:
    return Path(path).read_text().strip()


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


def generate_answer(
    question: str, chunks: list[dict], model: str, system_prompt_path: str = "system-prompt.txt"
) -> str:
    """Generate an answer from retrieved chunks using Ollama chat."""
    context = _format_context(chunks)
    system_prompt = _load_system_prompt(system_prompt_path)

    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
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
