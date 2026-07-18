---
name: architecture-eslint-type-aware-outside-src
description: Type-aware ESLint outside src/ needs an explicit `project` — projectService only discovers the root tsconfig.json, and a lint glob alone silently checks nothing type-aware
metadata:
  type: architecture
---

Adding a directory to the `lint` script's eslint glob does **not** give it the type-aware rules. Two separate things must line up, and neither fails loudly when missing.

**1. The rules are scoped by `files:`.** `eslint.config.js` puts `recommendedTypeChecked` and the strict rules (`no-floating-promises`, `no-misused-promises`, `complexity`, `import-x/no-cycle`) inside a block with `files: ['src/**/*.ts']`. Anything outside `src/` matched only the bare `scripts/**` block, which sets `languageOptions` and nothing else — so `npm run lint` reported "no issues" on `scripts/` while checking essentially nothing. Verify with `npx eslint --print-config <file>`: if `parserOptions` comes back `{}` and the rules read `undefined`, they are not applied.

**2. `projectService: true` only discovers the root `tsconfig.json`.** That file has `include: ["src/**/*"]`, so every file under `scripts/` fails with `Parsing error: ... was not found by the project service`. Point the block at the right tsconfig explicitly instead: `parserOptions: { project: './tsconfig.scripts.json', tsconfigRootDir: import.meta.dirname }`.

**Why:** `scripts/` was invisible to both eslint and `tsc` (the root tsconfig's `include`/`rootDir` are `src`-only), so ~250 lines of release-critical code carried zero verification. Turning the rules on immediately surfaced 14 real errors, all cascading from one untyped `createRequire('../package.json')` returning `any`.

**How to apply:** any new top-level dir with TS (`scripts/`, `tools/`) needs (a) its own tsconfig for `tsc --noEmit`, (b) an eslint block with explicit `project`, and (c) the dir added to the lint glob. Prove it works by introducing a deliberate type error and confirming it fails — a passing lint run is not evidence the files were read. Related eslint-config-silently-does-nothing trap: [[architecture-import-x-no-cycle-needs-extensions-setting]].
