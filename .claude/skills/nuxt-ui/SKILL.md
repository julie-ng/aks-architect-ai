---
name: nuxt-ui
description: Build UIs with @nuxt/ui v4 — 125+ accessible Vue components with Tailwind CSS theming. Use when creating interfaces, customizing themes to match a brand, building forms, or composing layouts like dashboards, docs sites, and chat interfaces.
original_source: "https://github.com/nuxt/ui/blob/v4/skills/nuxt-ui/SKILL.md"
---

# Nuxt UI

This app uses Nuxt UI to serve the frontend.

## State

- Currently, state is only persisted in user's browser. Avoid backend state.
- Avoid external plugins to integrate [Pinia](https://pinia.vuejs.org/). Instead prefer composables from Vue.js core team:
  - [useLocalStorage](https://vueuse.org/core/useLocalStorage/)
  - [useSessionStorage](https://vueuse.org/core/useSessionStorage/)
- **SSR + Pinia + useLocalStorage:** Pinia hydration overwrites client-side refs with the server's empty state, wiping localStorage data. Fix: return the ref with `skipHydrate()` in the store (e.g. `return { sessions: skipHydrate(sessions) }`).

## Theming & Branding

Nuxt UI ships with a default look. The goal is to adapt it to your brand so every app looks unique.

**Always use semantic utilities** (`text-default`, `bg-elevated`, `border-muted`), never raw Tailwind palette colors. See [references/theming.md](references/theming.md) for the full list.

### Colors

7 semantic colors (`primary`, `secondary`, `success`, `info`, `warning`, `error`, `neutral`) configurable at runtime:

```ts
// Nuxt — app.config.ts
export default defineAppConfig({
  ui: { colors: { primary: 'indigo', neutral: 'zinc' } }
})
```

```ts
// Vue — vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'

export default defineConfig({
  plugins: [
    vue(),
    ui({
      ui: { colors: { primary: 'indigo', neutral: 'zinc' } }
    })
  ]
})
```

### Customizing components

**Override priority** (highest wins): `ui` prop / `class` prop > global config > theme defaults.

The `ui` prop overrides a component's **slots** after variants are computed — it wins over everything:

```vue
<UButton :ui="{ base: 'rounded-none', trailingIcon: 'size-3 rotate-90' }" />
<UCard :ui="{ header: 'bg-muted', body: 'p-8' }" />
```

**Read the generated theme file** to find slot names for any component:

- **Nuxt**: `.nuxt/ui/<component>.ts`
- **Vue**: `node_modules/.nuxt-ui/ui/<component>.ts`

> For CSS variables, custom colors, global config, compound variants, and a **full brand customization playbook**, see [references/theming.md](references/theming.md)

> For full composable reference, see [references/composables.md](references/composables.md)

## Additional references

Load based on your task — **do not load all at once**:

- [references/theming.md](references/theming.md) — CSS variables, custom colors, component theme overrides
- [references/components.md](references/components.md) — all 125+ components by category with props and usage
- [references/composables.md](references/composables.md) — useToast, useOverlay, defineShortcuts
- Generated theme files — all slots, variants, and default classes for any component (Nuxt: `.nuxt/ui/<component>.ts`, Vue: `node_modules/.nuxt-ui/ui/<component>.ts`)
