---
name: auth
description: Authentication patterns in this Nuxt app — server guards, client session state, useUserSession vs AuthState, and cookie forwarding. Use when adding protected routes, reading user identity, or rendering auth-conditional UI.
---

# Authentication

Auth is provided by `nuxt-auth-utils`. GitHub OAuth is the only provider (`/api/auth/github`).

## Server-side — route guard

Every protected API route calls `requireUserId(event)` at the top. It reads the session cookie, throws a 401 if unauthenticated, and sets `event.context.userId` for use downstream.

```ts
// server/utils/require-user-id.ts
export async function requireUserId (event: H3Event): Promise<string> {
  const { user } = await getUserSession(event)
  const userId = user?.id
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  event.context.userId = userId
  return userId
}

// Usage in any server route
export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  // userId is now guaranteed to be a string
})
```

## Client-side — page middleware

`app/middleware/require-user-id.ts` redirects unauthenticated users to `/login`. Apply it per-page with `definePageMeta`:

```ts
// Redirect to /login if not authenticated
definePageMeta({ middleware: 'require-user-id' })
```

The middleware uses `useUserSession()` internally — it runs on the client after hydration.

## Client-side — when to use `useUserSession()` vs `<AuthState>`

Both come from `nuxt-auth-utils` and expose the same session state, but they serve different contexts:

### `useUserSession()` — use in `<script setup>` and stores

Use when you need session state in JavaScript — in layouts, pages, composables, or stores. Returns reactive refs.

```ts
const { loggedIn, user, session, clear } = useUserSession()

// Guard conditional logic
if (!loggedIn.value) return

// Read user identity
const userId = user.value?.id
```

Used in: `default.vue` layout, `chat-session.store.ts`, `chats.store.ts`, route middleware.

### `<AuthState v-slot="{ loggedIn, user, clear }">` — use in templates

Use when you need auth state directly in the template without adding `<script setup>` boilerplate. The slot exposes the same values as `useUserSession()`, plus `clear` for logout.

```vue
<AuthState v-slot="{ loggedIn, user, clear }">
  <template v-if="loggedIn">
    <UUser :name="user?.name" />
    <UButton @click="logout(clear)" />
  </template>
  <template v-else>
    <UButton to="/api/auth/github" label="Login with GitHub" external />
  </template>
</AuthState>
```

Used in: `sidebar-footer.vue` — the only place `AuthState` is used because it needs both `user` (display) and `clear` (logout action) without any other script logic.

### Summary

| | `useUserSession()` | `<AuthState>` |
|---|---|---|
| Where | `<script setup>`, stores, composables | Template only |
| When | Need state in JS logic | Auth-conditional UI with no other script needs |
| Logout | Call `clear()` from destructure | Pass `clear` from slot to a handler |

## Cookie forwarding — `useRequestFetch()` in stores

During SSR, store actions that call `$fetch` run on the Nuxt server — the browser's session cookie is not automatically forwarded. Use `useRequestFetch()` instead, which forwards the incoming request headers (including cookies).

```ts
export const useChatsStore = defineStore('chats', () => {
  const requestFetch = useRequestFetch()  // call in setup scope, not inside actions

  async function fetchSessions () {
    const { loggedIn } = useUserSession()
    if (!loggedIn.value) return
    const data = await requestFetch('/api/sessions')  // cookies forwarded during SSR
  }
})
```

`$fetch` is fine for mutations (POST/PATCH/DELETE) — those are always user-initiated on the client, where the browser sends cookies natively.

| Action | Fetch | Why |
|---|---|---|
| GET (initial load, may run during SSR) | `requestFetch()` | SSR needs cookie forwarding |
| POST / PATCH / DELETE (mutations) | `$fetch()` | Always client-initiated, browser sends cookies |
