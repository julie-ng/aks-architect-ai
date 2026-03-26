---
name: ai-sdk
description: AI SDK v6 patterns, gotchas, and conventions for this project. Use when working with the Chat class, sendMessage, streaming, or server-side AI SDK code in advisor-ui.
---

# AI SDK v6 (`ai` + `@ai-sdk/vue`)

## Chat class — body must go on sendMessage, not constructor

The `body` option on `new Chat({ body: { ... } })` is **silently ignored** — fields are never sent to the server. This is a known AI SDK v6 behavior.

### Wrong

```typescript
// Constructor-level body is NOT sent with requests
chat = new Chat({
  id: chatId,
  messages: session.messages,
  body: {
    domains: ['networking', 'security'],
    designId: session.designId,
  },
})

chat.sendMessage({ text: message })
```

### Correct

```typescript
// Build body once, pass on every sendMessage call
const chatBody = {
  domains: ['networking', 'security'],
  ...(session.designId ? { designId: session.designId } : {}),
}

chat = new Chat({
  id: chatId,
  messages: session.messages,
})

chat.sendMessage({ text: message }, { body: chatBody })
```

### Docs

- Stale body data: https://ai-sdk.dev/docs/troubleshooting/use-chat-stale-body-data
- Custom request options: https://ai-sdk.dev/docs/troubleshooting/use-chat-custom-request-options

## Server-side patterns

- Use `UIMessage` type + `convertToModelMessages()` from `ai`
- Wrap handler in `defineLazyEventHandler` for one-time async init
- Destructure custom body fields directly from `readBody(event)`:

```typescript
const { messages, domains, designId } = await readBody(event)
```

- Stream responses via `result.toUIMessageStreamResponse()`
- Attach metadata (sources, reformulated query) via `messageMetadata` callback

## Provider setup

- Factory function in `server/utils/provider.ts`
- Switched via `NUXT_AI_PROVIDER` env var: `ollama` (local) or `anthropic` (prod)
- `ollama-ai-provider-v2` requires zod v4
