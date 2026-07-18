---
name: architecture-import-x-no-cycle-needs-extensions-setting
description: import-x/no-cycle silently no-ops on .ts files unless settings['import-x/extensions'] includes '.ts', even with a correct TS resolver configured
metadata:
  type: architecture
---

`eslint-plugin-import-x` rules that build an export map (`no-cycle`, `no-unresolved`, etc.) gate
on **two independent, unrelated settings** — both must be correct or the rule silently no-ops
with zero errors and zero warnings:

1. `import-x/resolver-next` (or legacy `import-x/resolver`) — resolves a specifier (e.g. `'./foo.js'`)
   to a file path (e.g. `.../foo.ts`). `createTypeScriptImportResolver()` from
   `eslint-import-resolver-typescript` handles this correctly for this project's NodeNext
   `.js`-specifier-pointing-at-`.ts`-source convention.
2. `import-x/extensions` — a separate allowlist `ExportMap.for()` checks (`hasValidExtension()`
   in `eslint-plugin-import-x/lib/utils/ignore.js`) **after** resolution succeeds, before it will
   read/parse the resolved file to build its export map. Defaults to `['.js', '.mjs', '.cjs']` —
   `.ts` is NOT included by default.

If only (1) is configured, resolution succeeds (verifiable by calling the resolver directly, or via
`DEBUG=eslint-plugin-import-x:*` showing `ModuleCache ... setting entry` for the resolved path),
but `ExportMap.for()` still returns `null` at the `hasValidExtension` check with **no log line and
no error** — so `no-cycle`'s `ExportMap.get()` returns `null`, the import is silently skipped, and
a real cycle produces zero diagnostics. This looks identical to a resolver misconfiguration, which
is why fixing only the resolver (legacy vs. `-next`, `project` vs `projectService`, single-file vs
whole-project lint) never resolves it — the fix must add `.ts` to `import-x/extensions` too.

**Why:** cost a full DEBUG-trace + `node_modules` source read (`ExportMap.for` in
`eslint-plugin-import-x/lib/utils/export-map.js`, `hasValidExtension`/`getFileExtensions` in
`lib/utils/ignore.js`) to isolate, because the resolver-only explanation is the obvious first guess
and _looks_ sufficient (matches the plugin's own inline comment in `eslint.config.js` before this
fix). The plugin's own `flat/typescript` shared config sets `import-x/extensions` correctly, but
this project intentionally uses `import-x/resolver-next` standalone (not that shared config), so the
extensions default was never overridden.

**How to apply:** whenever `src/**/*.ts` gets a new `import-x/*` rule added (or the resolver setup
changes), verify `eslint.config.js`'s `settings['import-x/extensions']` still includes `.ts`. If an
`import-x` rule (no-cycle, no-unresolved, etc.) silently reports nothing on code you know violates
it, check this setting before re-debugging the resolver.
