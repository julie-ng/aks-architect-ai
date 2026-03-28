---
name: ai-sdk
description: AI SDK v6 patterns, gotchas, and conventions for this project. Use when working with the Chat class, sendMessage, streaming, or server-side AI SDK code in advisor-ui.
---

# AI SDK v6 (`ai` + `@ai-sdk/vue`)

## Chat class — use `shallowRef`, never `ref`

The `Chat` class exposes `messages`, `status`, and `error` as prototype getters. Wrapping the instance in `ref()` deep-proxies it and breaks these getters — they return `undefined`.

```ts
// ✅ shallowRef — prototype getters work correctly
const chat = shallowRef<Chat<UIMessage> | null>(null)

// ❌ ref — deep proxy breaks prototype getters
const chat = ref<Chat<UIMessage> | null>(null)
```

## Chat class — initialize with `import.meta.client`, not `onMounted`

The `Chat` class is client-only (streaming connections, browser APIs). Use `import.meta.client` guard in the composable — not `onMounted` in the component. This keeps the component template clean and avoids the need for a separate "ready" flag.

```ts
// ✅ In composable — import.meta.client guard
if (import.meta.client) {
  chat.value = new Chat({ ... })
}

// ❌ In component — onMounted forces a "ready" flag workaround
onMounted(() => {
  chat = new Chat({ ... })
})
```

## Chat class — use `DefaultChatTransport` for request body

`DefaultChatTransport` body IS sent with every request. The `Chat` constructor `body` option is silently ignored — never put fields there.

```ts
// ✅ DefaultChatTransport — body is forwarded on every request
chat.value = new Chat({
  id: chatId,
  messages: chatSessionStore.messages || [],
  transport: new DefaultChatTransport({
    api: '/api/chat',
    body: chatSessionStore.designId
      ? { designId: chatSessionStore.designId }
      : undefined,
  }),
})

// ❌ Constructor body — silently ignored, never sent
chat = new Chat({
  body: { designId: session.designId },
})
```

## Wrap chat UI in `<ClientOnly>`, not `v-if`

Chat sessions load messages from the DB before hydration. Using `v-if="chat"` causes a hydration mismatch (server renders `<!---->`, client renders `<div>`). Use `<ClientOnly>` instead — it's explicit about intent and avoids the mismatch.

```vue
<!-- ✅ -->
<ClientOnly>
  <UChatMessages :messages="messages" ... />
  <UChatPrompt ... />
</ClientOnly>

<!-- ❌ causes hydration mismatch -->
<UChatMessages v-if="chat" :messages="messages" ... />
```

See: `app/pages/chat/[id].vue`

## Composable pattern for `messages` and `status`

Expose `messages` and `status` as computed fallbacks — store values during SSR, Chat getters on client. This avoids blank flashes during hydration.

```ts
const messages = computed(() => {
  if (chat.value) { return chat.value.messages }
  else { return chatSessionStore.messages }
})

const status = computed(() => chat.value?.status ?? 'ready')
```

## Server-side — use `createUIMessageStream`

`createUIMessageStream` opens the stream immediately, so the client sees indicator dots during RAG retrieval. Do NOT use `streamText(...).toUIMessageStreamResponse()` — the stream doesn't open until LLM starts responding.

```ts
// ✅ Stream opens immediately — client sees indicator during retrieval
const stream = createUIMessageStream({
  execute: async (writer) => {
    const chunks = await fetchRAGContext(question)
    // ... attach metadata, run streamText, merge into writer
  },
})
return createUIMessageStreamResponse({ stream })

// ❌ Stream opens only when LLM starts — blank gap during retrieval
return result.toUIMessageStreamResponse()
```

## Server-side — reading the request body

```ts
const { messages, designId } = await readBody(event)
```

Convert messages for the LLM with `convertToModelMessages()` from `ai`.

## Tool calling

- Register tools in the `tools` option of `streamText`
- Use `stepCountIs(2)` to prevent tool loops (allows 1 tool call + 1 follow-up response)
- Check `isToolUIPart(part)` from `ai` to render tool parts in the template
- Check `isToolStreaming(part)` from `@nuxt/ui/utils/ai` to show loading state

## Provider setup

- Factory function in `server/utils/provider.ts`
- Switched via `NUXT_AI_PROVIDER` env var: `ollama` (local) or `anthropic` (prod)
- Default local model: `gemma3:4b`, production: `claude-sonnet-4-6`
- `ollama-ai-provider-v2` requires zod v4
