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

### Linter

- Do run `npm run lint` from the [./advisor-ui/](./../../advisor-ui/) directory after a plan execution. 
- Do **not** run linter for edits without a plan.
