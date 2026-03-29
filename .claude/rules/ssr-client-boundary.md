---
paths:
  - "advisor-ui/**/*.ts"
  - "advisor-ui/**/*.vue"
---

# SSR / Client Boundary

This app uses Nuxt universal rendering — pages render on the server first, then hydrate on the client. Violations cause hydration mismatches, blank flashes, or broken reactivity.

## `<ClientOnly>` for client-only UI

Wrap UI that depends on client-only instances (AI SDK `Chat`, browser APIs) in `<ClientOnly>`. Do NOT use `v-if="someClientRef"` as a guard — it causes hydration mismatches because the server renders `<!---->` but the client renders a real element.

```vue
<!-- ✅ -->
<ClientOnly>
  <UChatMessages :messages="messages" />
  <UChatPrompt @submit="onSubmit" />
</ClientOnly>

<!-- ❌ hydration mismatch — server and client disagree on what to render -->
<UChatMessages v-if="chat" :messages="messages" />
```

## `shallowRef` for class instances

Class instances with prototype getters (e.g. AI SDK `Chat`) must use `shallowRef`, not `ref`. Vue's `ref()` deep-proxies the object and breaks prototype getters — they return `undefined`.

```ts
// ✅
const chat = shallowRef<Chat<UIMessage> | null>(null)

// ❌ ref() deep-proxies and breaks .messages, .status, .error
const chat = ref<Chat<UIMessage> | null>(null)
```

## `import.meta.client` for client-only initialization

Prefer `import.meta.client` in composables over `onMounted` in components for initializing client-only instances. This keeps pages thin and avoids "ready" flag workarounds.

`onMounted` is still correct when you need actual DOM access (scroll, focus, measuring elements).

```ts
// ✅ In composable
if (import.meta.client) {
  chat.value = new Chat({ ... })
}

// ⚠️ Fine for DOM access, but don't use just to avoid SSR
onMounted(() => {
  scrollContainerRef.value?.scrollTo(...)
})
```

## SSR data loading — `callOnce` vs direct `await`

Load data at the page level before the composable runs. The composable then picks it up from the store. **Which pattern depends on whether the page uses `page-key`:**

```vue
<!-- ✅ Stable page (layout, index) — callOnce prevents double load -->
<script setup lang="ts">
await callOnce('chat-sessions', () => chatsStore.fetchSessions())
</script>

<!-- ✅ Param-driven page with page-key — direct await, no callOnce -->
<script setup lang="ts">
// page-key forces remount on param change, which breaks callOnce's dedup.
// Direct await runs on both SSR + client hydration — accepted cost of page-key.
await useChatSessionStore().load(chatId)
const { messages, status } = useChatSession(chatId)
</script>
```

`callOnce` caches by key for the app lifecycle. With `:page-key="$route.fullPath"`, Vue recreates the component on navigation — but `callOnce` still thinks it already ran, so it skips. This causes stale data. `mode: 'navigation'` doesn't fix it either.

## Non-reactive `let` in stores doesn't hydrate

`let` variables in Pinia setup stores are set during SSR but don't carry to the client. Use a `setX()` action to re-set them on the client, or use `ref()` if the value needs to be reactive.

```ts
// ✅ let for internal ID + explicit setter
let _id: string | null = null
function setId (chatId: string) { _id = chatId }

// ❌ _id set during SSR load() is null on client
let _id: string | null = null
async function load (chatId: string) { _id = chatId }  // client never sees this
```
