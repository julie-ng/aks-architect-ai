# Advisor UI

Nuxt 3 streaming chat UI for the AKS Architect advisor.

## Stack

- [Advisor UI](./) is a Nuxt 3 app with:
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
    participant Nuxt as Advisor UI<br/>(Nuxt.js)
    participant API as Retrieval API<br/>(Python FastAPI)
    participant LLM

    Note over Browser: Turn 1

    activate Browser
    Browser->>+Nuxt: messages: [{ user: "how do I size node pools?" }]
    Nuxt->>+API: { question, history: [] }
    API-->>-Nuxt: { chunks, reformulated_query }

    Note over Nuxt: Append RAG chunks to<br/>system prompt as &lt;context&gt; block

    Nuxt->>+LLM: system: "...&lt;context&gt;[1] Title...[2] Title...&lt;/context&gt;"<br/>messages: [{ user: "how do I size node pools?" }]
    LLM-->>-Nuxt: "For node pool sizing, see [1]..."
    Nuxt-->>-Browser: stream response + source metadata
    deactivate Browser

    Note over Browser: Renders cited sources<br/>as clickable badges

    Note over Browser: Turn 2

    activate Browser
    Browser->>+Nuxt: messages: [<br/>{ user: "how do I size node pools?" },<br/>{ assistant: "For node pool sizing..." },<br/>{ user: "what about spot instances?" }]
    Nuxt->>+API: { question, history: [prior messages] }
    API-->>-Nuxt: { chunks, reformulated_query }

    Note over Nuxt: New &lt;context&gt; block with<br/>fresh chunks for this turn

    Nuxt->>+LLM: system: "...&lt;context&gt;[1] Title...[2] Title...&lt;/context&gt;"<br/>messages: [<br/>{ user: "how do I size node pools?" },<br/>{ assistant: "For node pool sizing..." },<br/>{ user: "what about spot instances?" }]
    LLM-->>-Nuxt: "Spot instances can reduce costs [1]..."
    Nuxt-->>-Browser: stream response + source metadata
    deactivate Browser

    Note over LLM: Turn 1's RAG chunks are gone.<br/>LLM sees its prior answer<br/>but not the source documents.
```
