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

Sequence flow as of 17 March.

**Chunks - when and where?:** 
- Only the current turn's RAG chunks are visible to the LLM. 
- Previous turns' chunks are not carried forward
- Browser stores the original user text, not the RAG-augmented version. 
- This is intentional: once the LLM has generated a cited response, the raw chunks have served their purpose.

```mermaid
sequenceDiagram
    participant Browser
    participant Nuxt as Advisor UI<br/>(Nuxt.js)
    participant API as Advisor API<br/>(Python FastAPI)
    participant LLM

    Note over Browser: Turn 1

    activate Browser
    Browser->>+Nuxt: messages: [{ user: "how do I size node pools?" }]
    Nuxt->>+API: { question, history: [] }
    API-->>-Nuxt: { chunks, reformulated_query }

    Note over Nuxt: Replace last user message<br/>with RAG-augmented version

    Nuxt->>+LLM: [{ user: "Docs:\n[chunk1]...\nQ: how do I size node pools?" }]
    LLM-->>-Nuxt: "For node pool sizing, see [1]..."
    Nuxt-->>-Browser: stream response
    deactivate Browser

    Note over Browser: Stores ORIGINAL user text,<br/>not the RAG-augmented version

    Note over Browser: Turn 2

    activate Browser
    Browser->>+Nuxt: messages: [<br/>{ user: "how do I size node pools?" },<br/>{ assistant: "For node pool sizing..." },<br/>{ user: "what about spot instances?" }]
    Nuxt->>+API: { question, history: [prior messages] }
    API-->>-Nuxt: { chunks, reformulated_query }

    Note over Nuxt: Replace only the LAST<br/>user message with new RAG chunks

    Nuxt->>+LLM: [<br/>{ user: "how do I size node pools?" },<br/>{ assistant: "For node pool sizing..." },<br/>{ user: "Docs:\n[chunk3]...\nQ: what about spot instances?" }]
    LLM-->>-Nuxt: "Spot instances can reduce costs..."
    Nuxt-->>-Browser: stream response
    deactivate Browser

    Note over LLM: Turn 1's RAG chunks are gone.<br/>LLM sees its prior answer<br/>but not the source documents.
```
