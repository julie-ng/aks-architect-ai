# Documentation

Docs and references for humans that I keep coming back to.

## AI Engineering

Patterns and goals for a "smart" architect assistant/agent. 

- [Context Engineering for Personalization - State Management with Long-Term Memory Notes using OpenAI Agents SDK](https://developers.openai.com/cookbook/examples/agents_sdk/context_personalization) - OpenAI, (5 Jan 2026)
- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) - Anthropic, (29 Sept 2025)
- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) - Anthropic, (19 Dec 2024)
- [LangGraph Docs - Memory Overview](https://docs.langchain.com/oss/python/langgraph/memory)

## NuxtJS

Frontend is hard.

- [Key Concepts > Nuxt Lifecycle](https://nuxt.com/docs/4.x/guide/concepts/nuxt-lifecycle)
- [Recipts > Sessions & Authentication](https://nuxt.com/docs/4.x/guide/recipes/sessions-and-authentication)
  - [nuxt-auth-utils](https://nuxt.com/modules/auth-utils) module
- [Getting Started > Data Fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching) 
  - `$fetch()` 
  - vs `useFetch` 
  - vs `useAsyncData()`
  - vs `useRequestFetch()`
- [Pinia > Nuxt > `callOnce()`](https://pinia.vuejs.org/ssr/nuxt.html)

### AI SDK - Chat Flow

Sent to LLM API on _every_ message:

- Full system prompt 
- All messages 
- RAG context 

```
Browser → POST /api/chat (messages only, no system prompt)
  → Nuxt server (chat.post.ts):
      1. Fetches RAG chunks from FastAPI
      2. Builds system prompt + context
      3. Calls Anthropic API via streamText():
           {
             system: "You are an AKS architect...\n<context>...</context>",
             messages: [
               { role: "user", content: "How should I set up networking?" },
               { role: "assistant", content: "Based on your requirements..." },
               { role: "user", content: "What about ingress?" }
             ]
           }
      4. Streams response tokens back to browser
```      

## Misc.

### AI Model Pricing for personal reference.

- [Anthropic Model Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Vercel AI Models Pricing](https://vercel.com/ai-gateway/models)
- [MSFT Foundry Pricing for Anthropic](https://marketplace.microsoft.com/en-us/product/anthropic.anthropic-claude-sonnet-4-6-offer?tab=Overview) - pricing is buried in Foundry portal
