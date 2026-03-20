---
paths:
  - "advisor-ui/app/components/**/*.vue"
  - "advisor-ui/app/layout/**/*.vue"  
  - "advisor-ui/app/pages/**/*.vue"  
  - "advisor-ui/app/stores/**/*.ts"  
  - "advisor-ui/app/app.vue"    
---


# Nuxt & Vue Best Practices and Conventions

## Components 

- Attributes on components use kebab-case: `<my-component my-prop="value" />`
- Use `defineModel()` for v-model two-way bindings — never manually wire emits + props

### File Naming

Use Kebab-case, multi-word, .vue extension

- ✅ receipt/edit-form.vue, blob/sas-link.vue
- ❌ ReceiptEdit.vue, BlobSasLink.vue

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

### Pinia - Skip Hydration

If content is replaced in frontend use [skipHyrdate()](https://pinia.vuejs.org/api/pinia/functions/skipHydrate.html) to prevent SSR from overwriting content.

## Configuration Access

- Public (client-safe) config: `nuxt.config.ts` → `useRuntimeConfig().public.*`
- Private (server-only) config: `nuxt.config.ts` → `useRuntimeConfig().*` (no `.public`)
