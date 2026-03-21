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

### Pinia — Store Usage

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

## Configuration Access

- Public (client-safe) config: `nuxt.config.ts` → `useRuntimeConfig().public.*`
- Private (server-only) config: `nuxt.config.ts` → `useRuntimeConfig().*` (no `.public`)
