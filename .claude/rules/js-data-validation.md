---
paths:
  - "advisor-ui/**/*.js"
  - "advisor-ui/**/*.ts"
  - "advisor-ui/**/*.vue"
---

# Zod Validation

Zod schemas are the **single source of truth** for data validation across the entire stack. The `zodSchemas` object is auto-imported from `~/shared/utils/zod-schemas/`.

## Anti-Pattern: DO NOT manually check fields

```js
// ❌ DO NOT DO THIS — duplicates schema logic, causes inconsistency
if (contentType !== undefined) {
  updates.contentType = contentType
}
if (title !== undefined && typeof title === 'string') {
  updates.title = title
}
if (size !== undefined) {
  if (typeof size !== 'number' || size < 0) {
    throw createError({ statusCode: 400, message: 'Invalid size.' })
  }
  updates.size = size
}
```

## Correct Pattern: Use `readValidatedBody` + `zodSchemas`

```js
// ✅ DO THIS INSTEAD
const result = await readValidatedBody(event, body => zodSchemas.uploadUpdateSchema.safeParse(body))
if (!result.success) {
  setResponseStatus(event, 400)
  return {
    success: false,
    message: 'Invalid request body',
    errors: z.flattenError(result.error).fieldErrors,
  }
}
```

For query params use `getValidatedQuery` instead of `readValidatedBody`.

## Responsibility Split

| Layer | Responsibility |
|:--|:--|
| `shared/utils/zod-schemas/` | Define schemas (single source of truth) |
| Pinia stores | Validate data before sending to backend |
| Server API routes | Validate incoming request bodies/params |
| Components | Display errors — do NOT validate or type-check inputs |

## Schemas Available

All schemas exported from shared utils folder, e.g. `shared/utils/zod-schemas/*.ts` as `zodSchemas.*` to be available to both client and server side rendering:
