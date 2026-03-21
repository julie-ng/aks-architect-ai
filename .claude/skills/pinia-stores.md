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

## 3. Key Rules

- **Stores must not reference each other** — keep stores independent
- **Stores validate data via zod** before sending to backend — not components
- Use map-based caching (`{ [id]: { data, fetchedAt } }`) with TTL for lists and individual items
- Prefix internal helpers with `_` (e.g., `_log`, `_isCacheFresh`, `_cacheWidget`)
- Gate debug logging with a `debug` ref so it can be enabled per-store without code changes
