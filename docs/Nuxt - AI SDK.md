# AI SDK and Nuxt UI

## Problem

Some notes as I'm debugging why, _in a composable_, I **cannot access messages**. Trying to figure out where the vue refs are lost.

```js
// composables/useChatSession.ts

import { Chat } from '@ai-sdk/vue'
const chat = ref()
chat.value = new Chat(…)

// This does NOT work
chat.messages

// But this works
chat.value.state.messagesRef
````

Apparently

> In the latest Nuxt UI v4 implementations:  
> - `chat.messages` is often a getter that returns the value of the internal ref.
> - `chat.state.messagesRef` is the actual Ref object.

Conundrum: `messagesRef` works, but it's accessing private state 🤔

#### Approach? - wrap with `computed()`

If AI SDK and Nuxt UI are out of sync right now, encapsulate in a computed helper so that our templates are clean.

```ts
// Create a clean helper for your UI
const messages = computed(() => chat.value.state.messagesRef)
const status = computed(() => chat.value.state.statusRef)
```

#### Approach? - `toRef()`

```
const messages = toRef(chatInstance, 'messages') 
const status = toRef(chatInstance, 'status')
```

### Client vs Server Side 

Instead of relying on `onMounted(() => xyz.setup())` in templates, we could use inside the composable `xyz`:

```js
if (import.meta.server) {
  // runs server-side only
}
if (import.meta.client) {
  // runs client-side only
}
```

> [!WARNING]
> `import.meta.client` has no access to DOM. So if need autoscrolling, need to use `onMounted` hook.

---

## Nuxt UI

- min. v4.5.0 to use AI Components.
- "soon" likely means usable, but docs are lagging.
- [`<ChatMessages>` source code](https://github.com/nuxt/ui/blob/v4/src/runtime/components/ChatMessages.vue), has own `messagesRefs` <-- with `s` plural
- [Playground > pages/chat.vue](https://github.com/nuxt/ui/blob/v4/playgrounds/nuxt/app/pages/chat.vue), uses `new Chat({ messages })`

## AI SDK

The SDK has two (2) parts:

| SDK | Rendering | Interface |
|:--|:--|:--|
| AI SDK "Core" | Server-side | `Message[]` |
| AI SDK "UI" | Client-side | `UIMessage[]` |

The main difference is that `UIMessage` uses the `parts` structure (for multi-modal support) rather than just a content string.

### AI SDK UI 

- [@ai-sdk/vue package](https://www.npmjs.com/package/@ai-sdk/vue?activeTab=versions)
  - [change log](https://github.com/vercel/ai/blob/main/packages/vue/CHANGELOG.md)
  - [source: Vue.js provider](https://github.com/vercel/ai/tree/main/packages/vue) - Vue.js UI components for the AI SDK:
  - `useChat()` composable, [source: chat.vue.ts](https://github.com/vercel/ai/blob/main/packages/vue/src/chat.vue.ts)
  - [nuxt-openai example from Vercel](https://github.com/vercel/ai/blob/main/examples/nuxt-openai/pages/use-chat-messages/index.vue)


- [Docs: `useChat()`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) - includes API signature

### Misc.

- [Migration Guide - AI SDK 5.0 to 6.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)
