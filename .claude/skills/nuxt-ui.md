---
name: nuxt-ui
description: Build UIs with @nuxt/ui v4 — 125+ accessible Vue components with Tailwind CSS theming. Use when creating interfaces, customizing themes to match a brand, building forms, or composing layouts like dashboards, docs sites, and chat interfaces.
---

# Nuxt UI

This app uses `@nuxt/ui` v4 for all UI components.

## Theming & Branding

**Always use semantic utilities** (`text-default`, `bg-elevated`, `border-muted`), never raw Tailwind palette colors.

### Colors

7 semantic colors (`primary`, `secondary`, `success`, `info`, `warning`, `error`, `neutral`) configured in `app.config.ts`:

```ts
export default defineAppConfig({
  ui: { colors: { primary: 'indigo', neutral: 'zinc' } }
})
```

### Customizing components

**Override priority** (highest wins): `ui` prop / `class` prop > global config > theme defaults.

The `ui` prop overrides a component's **slots** after variants are computed:

```vue
<UButton :ui="{ base: 'rounded-none', trailingIcon: 'size-3 rotate-90' }" />
<UCard :ui="{ header: 'bg-muted', body: 'p-8' }" />
```

To find slot names for any component, read the generated theme file at `.nuxt/ui/<component>.ts`.

## Documentation

Always use the `nuxt-ui-remote` MCP server for component docs, composables, theming, and examples — never `context7` for Nuxt UI.
