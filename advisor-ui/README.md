# Advisor UI

Nuxt 4 streaming chat UI for the AKS Architect advisor.

## Stack

- [Advisor UI](./) is a Nuxt 4 app with:
  - Frontend UI
  - Nuxt Backend for Frontend `/api/chat` route that handles communications to:
    - RAG Service (Advisor API)
    - LLM
- [RAG Service](./../retrieval-api/)
- [AI SDK](https://ai-sdk.dev/) (`@ai-sdk/vue`) for chat management and streams LLM responses
 
## Chunks in Request-Response Flow

**Chunks - when and where?:**
- RAG chunks are appended to the system prompt as a `<context>` block — user messages are not modified
- Only the current turn's RAG chunks are visible to the LLM — previous turns' chunks are not carried forward
- Source metadata (title, URL) is sent to the browser via message metadata on stream finish
- The browser renders only sources the LLM actually cited with `[n]` references

```mermaid
sequenceDiagram
    participant Browser
    participant Nuxt as Advisor UI (Nuxt.js)
    participant API as Retrieval API (FastAPI)
    participant LLM

    rect rgba(240, 245, 255, 0.5)
    Note over Browser: Turn 1

    Browser->>+Nuxt: messages: [user: "how do I size node pools?"]
    Nuxt->>+API: question + history: []
    API-->>-Nuxt: chunks + reformulated_query

    Note over Nuxt: Append RAG chunks to system<br/>prompt as context block

    Nuxt->>+LLM: system prompt with context [1] [2]...<br/>+ user message
    LLM-->>-Nuxt: "For node pool sizing, see [1]..."
    Nuxt-->>-Browser: stream response + source metadata

    Note over Browser: Renders cited sources<br/>as clickable badges
    end

    rect rgba(240, 245, 255, 0.5)
    Note over Browser: Turn 2

    Browser->>+Nuxt: full message history<br/>+ new user message
    Nuxt->>+API: question + history
    API-->>-Nuxt: chunks + reformulated_query

    Note over Nuxt: New context block with<br/>fresh chunks for this turn

    Nuxt->>+LLM: system prompt with new context<br/>+ full message history
    LLM-->>-Nuxt: "Spot instances can reduce costs [1]..."
    Nuxt-->>-Browser: stream response + source metadata
    end

    Note over LLM: Turn 1 RAG chunks are gone.<br/>LLM sees its prior answer<br/>but not the source documents.
```
