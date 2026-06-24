---
name: release-pipeline
description: How releases work — GitHub Release is created by CI, notes travel via annotated tag, no AI key in CI
metadata:
  type: architecture
---

GitHub Release creation lives in **CI (`.github/workflows/publish.yml`)**, NOT in `scripts/release-flow.ts`. Pushing a `v*` tag triggers: `npm ci` → test → build → `npm pack` → `npm publish --provenance` → `gh release create` (notes + the `.tgz` artifact).

Release notes flow: `release-flow.ts` generates them locally via `AIService.generateReleaseNotes()` and writes them into an **annotated tag** (`git tag -a <tag> -m <notes>`). CI reads them back with `git for-each-ref "refs/tags/$GITHUB_REF_NAME" --format='%(contents)'`. **Why:** keeps the AI provider API key OUT of CI (public repo) — the tag is a secure side-channel. Requires `fetch-depth: 0` in checkout so the tag object is present.

**Why this design:** before, `gh release create` ran locally inside `release-flow.ts` and got skipped whenever the bump was done manually → GitHub Releases lagged npm (stuck at v1.0.7 while npm was at 1.0.9). Moving it to CI means any `v*` tag push always creates the Release.

**How to apply:** run `npm run release` (single command: bump → notes → commit → annotated tag → push). A manual lightweight tag still triggers a Release but with a plain `Release vX` fallback (no rich notes). The new `publish.yml` must be committed to `main` BEFORE the release tag is pushed (Actions uses the workflow at the tagged commit).

**Gotcha — `src/version.ts` `name = 'gitai'`:** this is the **CLI command name** (Commander `.name(name)` in `index.ts:29`), intentionally ≠ the npm package `@notyped/gitai`. `update-notifier` hardcodes `@notyped/gitai` separately (`index.ts:17`). Do NOT "fix" version.ts to the scoped name — it would rename the CLI command. A code reviewer already flagged this as a false positive. See [[node24-sdk-premature-close]] for the CI Node version context.
