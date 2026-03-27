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
