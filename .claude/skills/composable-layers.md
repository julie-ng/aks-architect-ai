---
name: composable-layers
description: Layer ownership rules for the chat + design architecture. Use when adding features to chat pages, composables, stores, or the Design model — to know what belongs where and what each layer is allowed to know about.
---

# Composable Layers

This app has a strict layering model for the chat + design feature. Every layer has a defined scope of knowledge. Violating these boundaries causes circular dependencies, untestable code, and leaking logic into pages.

## Layer responsibilities

| Layer | Location | Responsibility | Knows about |
|---|---|---|---|
| Vue component | `pages/`, `components/` | Template rendering, binds Nuxt UI to composable outputs | Composable only |
| `useChatWithDesign` | `composables/` | Orchestrates chat + design, injects design context, handles tool results | `useChatSession`, Design model, design store |
| `useChatSession` | `composables/` | Wraps AI SDK Chat, title generation, persistence via callbacks | AI SDK Chat, chat store |
| AI SDK Chat | `@ai-sdk/vue` | Message state, streaming lifecycle, transport protocol | External — not our code |
| Design model | `models/` | Per-instance behavior: decisions, dirty tracking, `toPromptContext()` | Nothing — persistence injected via callbacks |
| Stores | `stores/` | JSON cache + API endpoint definitions | API paths and data types only |

## Dependency graph

```
Component (pages/chat/[id].vue)
  │  Binds Nuxt UI directly to AI SDK Chat instance (chat.messages, chat.status)
  │
  └→ useChatWithDesign (composable)
       ├→ useChatSession (composable)
       │    ├→ AI SDK Chat      ← external, client-only
       │    └→ chatStore        ← imports ChatSessionData type only
       │
       ├→ Design model          ← no framework imports, no store imports
       └→ designStore           ← imports DesignData type only

  └→ createToolRouter (utility)
       ← pure function, receives handler callbacks from composable
```

Every arrow points down. No cycles.

## `useChatWithDesign` is the only cross-domain layer

`useChatWithDesign` is the **only** composable that knows about both chat and design. No other layer — not the page, not `useChatSession`, not the stores — should reference both domains.

```ts
// ✅ useChatWithDesign — correct place for cross-domain logic
export function useChatWithDesign (sessionId: string) {
  const { chat, sendMessage } = useChatSession(sessionId)
  const design = useDesign(sessionId)
  // ...inject design context into chat, handle tool calls
}

// ❌ page reaches into both — logic belongs in the composable
const { chat } = useChatSession(id)
const { design } = useDesign(id)
design.setDecision(...)  // page should not know about this
```

## Design model rules

- **Zero framework imports** — no Vue, no Pinia, no Nuxt. Fully testable without mocking.
- **Persistence is injected, never imported** — no circular dependencies with stores.
- **`toPromptContext()` returns an opaque blob** — the chat domain never parses the design output, it passes it through as-is.

```ts
// ✅ Persistence injected via callback
const design = new Design(data, {
  save: (id, changes) => designStore.update(id, changes),
})

// ❌ Model imports the store directly
import { useDesignsStore } from '~/stores/designs.store'
```

## Stores are dumb caches — never import model classes

Stores hold raw JSON only. They may import data types (`DesignData`, `ChatSessionData`) but never model classes (`Design`). Model instances are created in composables, not stores.

```ts
// ✅ Store holds raw data type
const byId = ref<Record<string, DesignData>>({})

// ❌ Store holds model instance
const byId = ref<Record<string, Design>>({})
```

> **Note:** `chats.store.ts` is semi-legacy and doesn't fully follow this pattern yet — it mixes session listing, message persistence, and title generation into one store. When refactoring, split into: `chats.store.ts` (session list only) and let `chat-session.store.ts` own per-session data and message persistence.

## Pages are thin — no business logic

Pages bind Nuxt UI components to composable outputs. If a function has a name or is more than a few lines, it belongs in a composable or util — not inline in the page.

```vue
<!-- ✅ Page delegates everything -->
<script setup lang="ts">
const { chat, design, sendMessage } = useChatWithDesign(chatId)
</script>

<!-- ❌ Page reaches into both domains -->
<script setup lang="ts">
const { chat } = useChatSession(chatId)
const { design } = useDesign(chatId)
async function sendMessage (text: string) {
  const context = design.value?.toPromptContext()
  await chat.value?.sendMessage({ text }, { body: { context } })
}
</script>
```
