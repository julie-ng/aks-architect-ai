# AI SDK and Nuxt UI

Some notes as I'm debugging why, in a composable, I cannot access messages

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

---

## Nuxt UI

- min. v4.5.0 to use AI Components.
- "soon" likely means usable, but docs are lagging.
- [`<ChatMessages>` source code](https://github.com/nuxt/ui/blob/v4/src/runtime/components/ChatMessages.vue), has own `messagesRefs` <-- with `s` plural
- [Playground > pages/chat.vue](https://github.com/nuxt/ui/blob/v4/playgrounds/nuxt/app/pages/chat.vue), uses `new Chat({ messages })`

## AI SDK
N.B. there is a AI SDK Core vs AI SDK UI

### AI SDK UI 

- [@ai-sdk/vue package](https://www.npmjs.com/package/@ai-sdk/vue?activeTab=versions)
  - [change log](https://github.com/vercel/ai/blob/main/packages/vue/CHANGELOG.md)
  - [source: Vue.js provider](https://github.com/vercel/ai/tree/main/packages/vue) - Vue.js UI components for the AI SDK:
  - `useChat()` composable, [source: chat.vue.ts](https://github.com/vercel/ai/blob/main/packages/vue/src/chat.vue.ts)
  - [nuxt-openai example from Vercel](https://github.com/vercel/ai/blob/main/examples/nuxt-openai/pages/use-chat-messages/index.vue)


- [Docs: `useChat()`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) - includes API signature

### Misc.

- [Migration Guide - AI SDK 5.0 to 6.0](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)
