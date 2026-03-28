---
paths:
  - "advisor-ui/**/*.ts"
  - "advisor-ui/**/*.vue"
---

# JavaScript 

## Code Style

Follow configuration in [eslint.config.mjs](./../../advisor-ui/eslint.config.mjs), esp:

- no semicolons
- max 3 vue properties per line
- add spaces before function parentheses
- Trailing commas required

### Linter

- Do run `npm run lint` from the [./advisor-ui/](./../../advisor-ui/) directory after a plan execution. 
- Do **not** run linter for edits without a plan.


ESLint is configured via the Nuxt ESLint module with `@stylistic/eslint-plugin`. See `eslint.config.mjs` for details.

## JSDoc

All exported functions must have JSDoc comments with `@param` and `@returns` tags. This applies everywhere — utils, composables, store actions, server routes, etc.

```ts
/**
 * Formats retrieved RAG chunks into a numbered context block for the system prompt.
 * The index numbers correspond to citation markers the LLM uses in responses.
 *
 * @param chunks - Retrieved chunks from the retrieval API
 * @returns Formatted text block ready for system prompt injection
 */
export function formatContext (chunks: RetrieveChunk[]): string {
```

## Code Conventions

### Internal / non-exported identifiers

Prefix with `_` to signal private/internal use — applies to variables, functions, and store helpers that are not part of the public API:

```ts
// ✅ Private store helper
const _isCacheFresh = (id) => { ... }

// ✅ Internal composable variable
let _hasGeneratedTitle = false
```

### Conditional spreads — multiline

Always expand conditional spreads across multiple lines. Never inline them:

```ts
// ✅
body: {
  question,
  history,
  ...(designId
    ? { design_id: designId }
    : {}
  ),
}

// ❌
body: { question, history, ...(designId ? { design_id: designId } : {}) }
```

### Prefer if/else over early return

Use explicit `if/else` blocks instead of early returns. Easier to read, easier to annotate with comments:

```ts
// ✅
if (condition) {
  return doA()
}
else {
  return doB()
}

// ❌
if (!condition) return
doB()
```

### Extract helpers early — don't stuff pages or routes

Pages (`app/pages/`) and server routes (`server/api/`) should be thin orchestrators. Business logic, formatting, and data transformation belong in helpers/utils from the start — not refactored out later:

- **Pages** → delegate to composables and stores
- **Server routes** → delegate to `server/utils/` helpers
- If a function is more than ~5 lines or has a name, it belongs in its own file

## File Naming

- Reusable utility/helper functions: `.utils.js` suffix (e.g., `filename.utils.js`)
- Corresponding tests: `.utils.test.js` suffix (e.g., `filename.utils.test.js`)
- Generate tests wherever possible

## Utility Functions

### Structure

For better overview of util functions, each function gets its own file. To illustrate, below is an example where `category` subfolder is optional.

```
utils/category/fn-1.ts
utils/category/fn-1.test.ts
utils/category/fn-2.ts
utils/category/fn-2.test.ts
utils/category/index.ts
```

And then in code, do

```js
import { fn1, fn2 } from 'utils/category'
```

### Placement

| Location | Purpose |
|:--|:--|
| `app/utils/` | Frontend-only (UI helpers, badge styles) |
| `server/utils/` | Backend-only (Azure SDK wrappers, auth helpers) |
| `shared/utils/` | Both client and server (text, string, date manipulation) |
