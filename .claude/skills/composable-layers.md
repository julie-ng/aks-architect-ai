---
name: composable-layers
description: Layer ownership rules for the chat + design architecture. Use when adding features to chat pages, composables, stores, the Design model, or the chat server route — to know what belongs where and what each layer is allowed to know about.
---

# Composable Layers

This app has a strict layering model for the chat + design feature. Every layer has a defined scope of knowledge. Violating these boundaries causes circular dependencies, untestable code, and logic leaking into pages.

## The key architectural decision: cross-domain wiring is server-side

Chat and design are kept **independent on the client**. There is no client composable that knows about both. Instead, the two domains are joined **on the server** in `server/api/chat.post.ts`:

1. The client sends `sessionId` + `designId` with every chat request (via the `DefaultChatTransport` body in `useChatSession`).
2. The server route fetches design context, detects design changes, and builds the framework schema — then injects them into the system prompt and registers design tools.

This keeps the client composables small and single-domain, and puts the orchestration where the design data and prompt assembly already live.

## Layer responsibilities

| Layer | Location | Responsibility | Knows about |
|---|---|---|---|
| Vue component | `pages/`, `components/` | Template rendering, binds Nuxt UI to composable/store outputs | Composables + stores |
| `chat.post.ts` | `server/api/` | **The cross-domain layer.** Retrieval + design context + change detection + prompt assembly + tool registration + streaming | Retrieval API, design server utils, provider, tools |
| `useChatSession` | `composables/` | Wraps AI SDK Chat, message persistence + title generation via the chat store. Sends `sessionId`/`designId` on the transport body | AI SDK Chat, chat-session store |
| `useDesign` / `useNewDesign` | `composables/` | Wire the designs store to the `Design` model; expose `design` as a computed `Design` instance | Design model, designs store |
| AI SDK Chat | `@ai-sdk/vue` | Message state, streaming lifecycle, transport protocol | External — not our code |
| Design model | `models/Design.ts` | Per-instance behavior: decisions/requirements, dirty tracking, derived paths, save/delete | Nothing — persistence injected via callbacks |
| Stores | `stores/` | Raw JSON cache + `$fetch`/`requestFetch` API calls | API paths and data types only |

## Dependency graph

```
Client:
  Component (pages/chat/[id].vue)
    ├→ useChatSession (composable)
    │    ├→ AI SDK Chat            ← external, client-only
    │    │    └ transport body: { sessionId, designId }  → server
    │    └→ chatSessionStore       ← imports ChatSessionData type only
    │
    └→ useDesign (composable)
         ├→ Design model           ← no framework imports, no store imports
         └→ designsStore           ← imports DesignData type only

Server (the join happens here):
  server/api/chat.post.ts
    ├→ POST /api/retrieve          ← FastAPI RAG
    ├→ fetchDesignContext(designId)
    ├→ detectDesignChange(designId, sessionId)
    ├→ buildFrameworkSchema(event)
    ├→ assembleSystemPrompt(...)   ← injects <design>, <design-change>, <framework>
    └→ streamText({ tools: { getDesignSnapshot, proposeDesignUpdate } })
```

Every client arrow points down. No cycles. The chat and design client subtrees never reference each other — they only meet on the server.

## Client composables stay single-domain

`useChatSession` knows chat. `useDesign` knows design. **Neither knows about the other.** A page may use both, but it must not thread design state into chat calls — that wiring is the server's job (the client already forwards `designId` on the transport body).

```ts
// ✅ Page uses both composables independently; server does the joining
const { chat, messages, sendMessage } = useChatSession(chatId)
const { design } = useDesign(chatId)   // for rendering the design panel, not for feeding chat

// ❌ Don't manually inject design context into a chat request on the client.
// The transport already sends designId; chat.post.ts fetches + injects the context.
await chat.value?.sendMessage({ text }, { body: { designContext: design.value?.someBlob } })
```

## Design model rules (`models/Design.ts`)

- **Zero framework imports** — no Vue, no Pinia, no Nuxt. Fully unit-testable without mocking (see `Design.test.ts`).
- **Persistence is injected, never imported** — constructed via `Design.from(raw, persist)` where `persist` implements `DesignPersistence` (`create`, `update`, `destroy`, `patchDecision`, `patchRequirement`). The composable supplies these callbacks by delegating to the store; the model never imports the store.

```ts
// ✅ useDesign injects persistence — no store import inside the model
const persist: DesignPersistence = {
  update: (id, changes) => store.update(id, changes),
  patchDecision: (id, key, value) => store.patchDecision(id, key, value),
  // ...
}
const design = computed(() => {
  const raw = store.get(id)
  return raw ? Design.from(raw, persist) : null
})

// ❌ Model imports the store directly
import { useDesignsStore } from '~/stores/designs.store'
```

## Stores are dumb caches — never hold model instances

Stores hold raw JSON keyed by id. They may import data types (`DesignData`, `ChatSessionData`) but never the `Design` model class. Model instances are created in composables, not stores.

```ts
// ✅ Store holds raw data type
const byId = ref<Record<string, DesignData>>({})

// ❌ Store holds model instance
const byId = ref<Record<string, Design>>({})
```

## Pages are thin — no business logic

Pages bind Nuxt UI components to composable/store outputs. If a function has a name or is more than a few lines, it belongs in a composable, util, or server util — not inline in the page.

```vue
<!-- ✅ Page delegates: SSR load via callOnce, then composables expose reactive state -->
<script setup lang="ts">
const { chat, messages, status, sendMessage } = useChatSession(chatId)
const { design } = useDesign(chatId)
</script>
```
