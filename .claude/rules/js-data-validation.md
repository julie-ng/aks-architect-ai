---
paths:
  - "advisor-ui/**/*.js"
  - "advisor-ui/**/*.ts"
  - "advisor-ui/**/*.vue"
---

# Zod Validation

Zod (v4) schemas are the **single source of truth** for data validation across the stack. Schemas live in `shared/utils/zod-schemas/` and are **named imports** from `~~/shared/utils/zod-schemas` (they are NOT auto-imported and there is no `zodSchemas.*` object):

```ts
import { createDesignSchema } from '~~/shared/utils/zod-schemas'
```

## Anti-Pattern: DO NOT manually check fields

```js
// ❌ DO NOT DO THIS — duplicates schema logic, causes inconsistency
if (title !== undefined && typeof title === 'string') {
  updates.title = title
}
if (decisions !== undefined) {
  if (typeof decisions !== 'object') {
    throw createError({ statusCode: 400, message: 'Invalid decisions.' })
  }
  updates.decisions = decisions
}
```

## Correct Pattern: `readValidatedBody` + a named schema

```ts
// ✅ DO THIS INSTEAD
import { updateDesignSchema } from '~~/shared/utils/zod-schemas'

const result = await readValidatedBody(event, body => updateDesignSchema.safeParse(body))
if (!result.success) {
  setResponseStatus(event, 400)
  return {
    success: false,
    message: 'Invalid request body',
    errors: z.treeifyError(result.error),
  }
}
```

Use `z.treeifyError(result.error)` to serialize validation errors — this is the Zod v4 replacement for `z.flattenError(...).fieldErrors`. For query params use `getValidatedQuery` instead of `readValidatedBody`.

## Responsibility Split

| Layer | Responsibility |
|:--|:--|
| `shared/utils/zod-schemas/` | Define schemas (single source of truth) |
| Pinia stores | Validate data before sending to backend |
| Server API routes | Validate incoming request bodies/params via `readValidatedBody` |
| Components | Display errors — do NOT validate or type-check inputs |

## Schemas Available

Exported as named schemas from `shared/utils/zod-schemas/` (via the folder's `index.ts`), available to both client and server:

- **`design-schemas.ts`** — e.g. `createDesignSchema`, `updateDesignSchema`, `updateSelectionSchema` (used by the design decision/requirement PATCH routes)
- **`session-schemas.ts`** — e.g. `createSessionSchema`, `updateSessionSchema`, `appendMessagesSchema`
