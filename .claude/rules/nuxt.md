---
paths:
  - "advisor-ui/app/components/**/*.vue"
  - "advisor-ui/app/layout/**/*.vue"
  - "advisor-ui/app/pages/**/*.vue"
  - "advisor-ui/app/stores/**/*.ts"
  - "advisor-ui/app/utils/**/*.ts"
  - "advisor-ui/app/app.vue"
---

# Nuxt & Vue Best Practices and Conventions

## File Naming

All files use kebab-case.

### Components

Multi-word, .vue extension:
- ✅ `receipt/edit-form.vue`, `blob/sas-link.vue`
- ❌ `ReceiptEdit.vue`, `BlobSasLink.vue`

### Stores

`<name>.store.ts` convention:
- ✅ `chats.store.ts`, `settings.store.ts`
- ❌ `chatSessions.ts`, `useChatsStore.ts`

### Utils

Flat in `app/utils/` — no subdirectories. One exported function per file, file name matches function name (enables Nuxt auto-imports):
- ✅ `shorten-citation-title.ts` → `export function shortenCitationTitle()`
- ❌ `citations/shorten-title.ts`, `citations/index.ts` (barrel)

## Components

- Attributes on components use kebab-case: `<my-component my-prop="value" />`
- Use `defineModel()` for v-model two-way bindings — never manually wire emits + props

## Auto-Imports

Nuxt auto-imports from `app/utils/`, `app/stores/`, and `app/composables/`. Don't add manual `import` statements for these — rely on auto-imports in components, pages, and layouts. Tests still need explicit imports.

## Error Handling

Prefer `createError()` over `new Error()` — it works correctly across both server and client contexts:

```js
// ✅ Good
throw createError({ statusCode: 404, message: 'Receipt not found' })

// ❌ Avoid in page/component context
throw new Error('Receipt not found')
```

## Client-Only Content

Wrap content that should not be server-rendered in `<ClientOnly>`:

```html
<ClientOnly>
  <my-component />
</ClientOnly>
```

Reference: `app/components/Upload/OverviewTabContent.vue`

### Pinia — Store as Data Abstraction Layer

Stores are the single source of truth for all data access and URL construction. Components and pages never construct API URLs, route paths, or interact with `$fetch` directly — they go through the store.

#### Route Path Construction

All route paths for a model live in the store as computed getters. Never construct URLs inline in templates or pages:

```ts
// ✅ In the store
const getPathById = computed(() => (id: string): string => `/designs/${id}`)
const getEditPathById = computed(() => (id: string): string => `/designs/${id}/edit`)

// ✅ In a template
:to="designsStore.getPathById(design.id)"

// ❌ Never construct paths outside the store
:to="`/designs/${design.id}`"
:to="`${designsStore.getPathById(id)}/edit`"
```

#### SSR-Compatible Data Fetching

This app uses Nuxt's universal rendering (SSR + client hydration). Use `callOnce()` for initial data fetching — never `onMounted` for GET requests that benefit from SSR:

```vue
<!-- ✅ SSR-safe: runs once on server, skips on client hydration -->
<script setup lang="ts">
const designsStore = useDesignsStore()
await callOnce(`design-${designId}`, () => designsStore.fetchDesign(designId))
</script>

<!-- ❌ Client-only: causes layout shift, no SSR benefit -->
<script setup lang="ts">
onMounted(async () => {
  await designsStore.fetchDesign(designId)
})
</script>
```

**Exception:** `onMounted` is correct for purely client-side actions with no SSR benefit — e.g. POST + redirect pages, or initializing browser-only APIs (AI SDK `Chat` class).

**Do NOT wrap Pinia actions in `useAsyncData()`** — use `callOnce()` instead. See `pinia-stores` skill for details.

| Fetch function | When to use |
|---------------|-------------|
| `requestFetch()` | GET actions that may run during SSR (needs cookie forwarding) |
| `$fetch()` | POST/PATCH/DELETE mutations (always user-initiated, browser sends cookies) |

#### Setup Stores

- Use [Setup Store](https://pinia.vuejs.org/core-concepts/#Setup-Stores) Syntax, so that:
  - `ref()`s become state properties (internal, not exposed directly)
  - `computed()`s become getters (read-only access for consumers)
  - `function()`s become actions (the only functions exposed)

```js
// ✅ - Good, use computed property for getters
const hasSessions = computed(() => sessions.value.length > 0)

// Example getter with param
const getBookById = computed(() => id => books.value[id])

// ❌ - Functions should be for actions only
function hasSessions (): boolean {
  return sortedSessions.value.length > 0
}
```

Avoid `storeToRefs()`. It exposes internal refs directly to consumers, bypassing the store's abstraction. Use computed getters and actions instead.

```ts
// ⚠️ scope too large
const { sortedSessions } = storeToRefs(chatsStore)
```

#### Syncing to LocalStorage

If syncing state to browser, use [@vueuse/core composables, e.g. `useLocalStorage()`](https://vueuse.org/core/useLocalStorage/), authored by official Vue.js members. Avoid additional and 3rd party dependencies.

Note `useLocalStorage()` handles serialization and automatically strips reactive refs.

#### Code Style

Don't destructure store methods. Use the store variable directly — it's clearer where methods come from:
- ✅ `const chatsStore = useChatsStore()` → `chatsStore.deleteSession(id)`
- ❌ `const { deleteSession, createSession } = useChatsStore()`

### Pinia — Skip Hydration

If content is replaced in frontend use [skipHydrate()](https://pinia.vuejs.org/api/pinia/functions/skipHydrate.html) to prevent SSR from overwriting content.

## Nuxt Content

### Use `path` not `stem` for content keys

Content files are prefixed with numbers for ordering (e.g. `1.organization-type.md`). Use `path.split('/').pop()` to derive the key — it strips both the path and the leading number prefix, giving stable keys like `organization-type`.

```ts
// ✅ Stable key, unaffected by reordering files
id: entry?.path?.split('/')?.pop()

// ❌ stem includes the number prefix — breaks if files are reordered
id: entry?.stem  // → "1.organization-type"
```

## Composables

### Static vs reactive data fetching

If a composable fetches content that never changes at runtime (e.g. YAML schemas via `queryCollection`), use plain `await` — not `useAsyncData` + `computed`. The parent component's reactive props are sufficient to drive reactive template updates.

```ts
// ✅ Static content — plain await
export async function useSpecSchema (collection: 'requirements' | 'components') {
  const entries = await queryCollection(collection).select('path', 'spec').all()
  // ...
}

// ❌ Unnecessary reactivity wrapping for static content
export async function useSpecSchema (collection: 'requirements' | 'components') {
  const { data: entries } = await useAsyncData(`spec-${collection}`, () =>
    queryCollection(collection).select('path', 'spec').all()
  )
  const lookup = computed(() => { /* ... */ })
}
```

Ask: "does this data change after the composable runs?" If no → plain `await`. If yes → `useAsyncData` / `computed`.

### Encapsulation — never expose internal state

Only expose the public API (helper functions). Never return raw lookup maps, intermediate data structures, or internal refs. If a consumer needs something new, add a helper function.

```ts
// ✅ Only expose functions
return { getQuestionTitle, getAnswerLabel }

// ❌ Leaks internal structure — consumers will bypass the helpers
return { lookup, getQuestionTitle, getAnswerLabel }
```

## Routing

### Query params — use `useRoute()` directly, don't add `ref` or `watch`

`useRoute()` is reactive. Read query params with a `computed()` getter; write them with `navigateTo()` or a computed setter. Never introduce a separate `ref` + `watch` to sync with the URL:

```ts
// ✅ Reactive query param, two-way
const route = useRoute()

const selectedTab = computed({
  get: () => String(route.query.tab ?? 'requirements'),
  set: (tab) => navigateTo({ query: { ...route.query, tab } })
})

// ❌ Unnecessary — ref + watch duplicates what useRoute() already provides
const selectedTab = ref('requirements')
watch(selectedTab, (tab) => router.replace({ query: { tab } }))
```

## Semantic Conditions

Never use inline `Object.keys(…).length`, `.length > 0`, or similar expressions in templates or conditionals. Extract them into a computed property (component-local) or a model getter (if reusable across components) with a semantic name:

```ts
// ✅ Semantic computed
const hasDecisions = computed(() => Object.keys(props.decisions).length > 0)
// template: v-if="hasDecisions"

// ✅ Model getter (reusable)
get hasBeenConfigured (): boolean {
  return Object.keys(this.decisions).length > 0 || Object.keys(this.requirements).length > 0
}

// ❌ Inline — no semantic meaning
v-if="Object.keys(props.decisions).length > 0"
v-if="messages.length > 0"
```

## Configuration Access

- Public (client-safe) config: `nuxt.config.ts` → `useRuntimeConfig().public.*`
- Private (server-only) config: `nuxt.config.ts` → `useRuntimeConfig().*` (no `.public`)
