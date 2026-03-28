---
name: pinia-stores
description: Pinia store conventions, structure, and patterns for this project. Use when creating a new store or modifying an existing store in app/stores/.
---

A store is a data management layer between frontend and backend that is scoped to a particular domain or model. It's a single source of truth for interacting with backend APIs, includ. validation and API routes.

# Pinia Stores

## 1. File Placement

Use the `.store.ts` suffix, e.g.

`~/app/stores/{name}.store.ts`


## 2. Standard Structure

Use the composition API style with clearly separated sections:

```js
import { defineStore } from 'pinia'

export const useWidgetsStore = defineStore('widgets', () => {
  // -------- STATE --------
  const widgetsById = ref({})
  const loading = ref({})   // Per-ID: { [id]: boolean, all: boolean }
  const saving = ref({})    // Per-ID: { [id]: boolean }
  const errors = ref({})    // Per-ID: { [id]: error, all: error }
  const debug = ref(false)

  const CACHE_TTL = 300000  // 5 minutes in milliseconds

  // -------- GETTERS --------
  const getWidgetById = computed(() => id => widgetsById.value[id]?.data)
  const allWidgets = computed(() => Object.values(widgetsById.value).map(entry => entry.data))

  // -------- INTERNAL HELPERS --------
  // Prefix with _ to signal private/internal use
  const _log = (...args) => debug.value && console.log('[widgets-store]', ...args)

  const _isCacheFresh = (id) => {
    const entry = widgetsById.value[id]
    return entry && (Date.now() - entry.fetchedAt) < CACHE_TTL
  }

  const _cacheWidget = (widget) => {
    widgetsById.value[widget.id] = { data: widget, fetchedAt: Date.now() }
  }

  // -------- ACTIONS --------
  const fetchById = async (id) => {
    if (_isCacheFresh(id)) return
    loading.value[id] = true
    try {
      const data = await $fetch(`/api/widgets/${id}`)
      _cacheWidget(data.widget)
    } catch (err) {
      errors.value[id] = err.message
    } finally {
      loading.value[id] = false
    }
  }

  // Optimistic update pattern
  const update = async (id, updates) => {
    const original = widgetsById.value[id]?.data  // save for rollback
    _cacheWidget({ ...original, ...updates })       // apply optimistically
    saving.value[id] = true
    try {
      const data = await $fetch(`/api/widgets/${id}`, { method: 'PUT', body: updates })
      _cacheWidget(data.updated)
    } catch (err) {
      _cacheWidget(original)                        // rollback on failure
      errors.value[id] = err.message
    } finally {
      saving.value[id] = false
    }
  }

  return {
    // State (expose what components need)
    loading, saving, errors,
    // Getters
    getWidgetById, allWidgets,
    // Actions
    fetchById, update,
  }
})
```

## 3. SSR-Compatible Data Fetching

This app uses Nuxt's universal rendering (SSR + client hydration). Stores must work correctly during SSR so that authenticated data is rendered on the server — no layout shift, no client-only `onMounted` fetches for initial data.

### The Problem

During SSR, Nuxt server-renders the page on behalf of the browser. But when store actions call `$fetch('/api/sessions')` during SSR, the request goes from the Nuxt server process to itself — and the browser's auth cookies are NOT automatically forwarded. The API route sees no session cookie → 401.

### The Solution: `useRequestFetch()`

`useRequestFetch()` returns a fetch function that automatically forwards the incoming request's headers (including cookies) during SSR. On the client, it behaves like regular `$fetch`.

Call it once in the store's setup scope (not inside an action — it's a Nuxt composable):

```ts
export const useChatsStore = defineStore('chats', () => {
  const requestFetch = useRequestFetch()  // must be in setup scope

  async function fetchSessions () {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) return

    const data = await requestFetch('/api/sessions')  // cookies forwarded during SSR
    // ...populate state
  }
})
```

### Which actions need `requestFetch` vs `$fetch`?

| Action type | Fetch function | Why |
|-------------|---------------|-----|
| **GET (initial load)** — may run during SSR | `requestFetch()` | SSR needs cookie forwarding |
| **POST/PATCH/DELETE (mutations)** — always user-initiated | `$fetch()` | Browser sends cookies natively, these never run during SSR |

### Calling store actions from components: `callOnce`

**Do NOT wrap Pinia actions in `useAsyncData()`** — the Nuxt docs explicitly warn against it:

> "useAsyncData is for fetching and caching data, not triggering side effects like calling Pinia actions, as this can cause unintended behavior such as repeated executions with nullish values"

Instead, use `callOnce()` which runs exactly once during SSR and skips re-execution on client hydration:

```vue
<!-- In a layout or page -->
<script setup lang="ts">
const chatsStore = useChatsStore()
await callOnce('chat-sessions', () => chatsStore.fetchSessions())
</script>
```

### Why not `useFetch` inside stores?

`useFetch` is a composable that must be called in setup scope and returns reactive `data`/`error` refs. It's designed for component-level data binding. Stores already manage their own reactive state, so using `useFetch` inside a store would create two competing reactive layers. Use `requestFetch()` (for SSR reads) or `$fetch()` (for mutations) instead.

### Client-only code that depends on fetched data

Some things genuinely can't run during SSR (e.g. AI SDK's `Chat` class which manages streaming connections). Prefer `import.meta.client` in a composable over `onMounted` in the component — it keeps pages thin and avoids needing a "ready" flag. Reserve `onMounted` for cases that genuinely require DOM access (e.g. scroll behavior, focus management).

```ts
// ✅ Preferred — composable handles client-only init
// useChatSession.ts
if (import.meta.client) {
  chatSessionStore.setId(chatId)
  chat.value = new Chat({ id: chatId, messages: chatSessionStore.messages || [] })
}
```

```vue
<!-- Page stays thin — no onMounted needed -->
<script setup lang="ts">
await callOnce(`chat-session-${chatId}`, () => useChatSessionStore().load(chatId))
const { chat, messages, status } = useChatSession(chatId)
</script>
```

```vue
<!-- ✅ onMounted is correct when you need DOM access -->
<script setup lang="ts">
onMounted(() => {
  scrollToBottom()
})
</script>
```

## 4. Key Rules

- **Stores must not reference each other** — keep stores independent
- **Stores validate data via zod** before sending to backend — not components
- Use map-based caching (`{ [id]: { data, fetchedAt } }`) with TTL for lists and individual items
- Prefix internal helpers with `_` (e.g., `_log`, `_isCacheFresh`, `_cacheWidget`)
- Gate debug logging with a `debug` ref so it can be enabled per-store without code changes
