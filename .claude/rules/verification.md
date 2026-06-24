---
paths:
  - "**/*"
---
# Verification before completion

Before claiming a task is done:
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`

Report the actual command output. Do not assert success without running them.
