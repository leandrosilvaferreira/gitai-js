---
name: release-pipeline
description: Publishing to npm — ALWAYS use the release skill; CI is the publisher, notes travel via annotated tag, and a green CI run does not prove the publish landed
metadata:
  type: architecture
---

**Any request to publish/ship/release/bump gitai → invoke the `release` skill first** (`.claude/skills/release/SKILL.md`, `/release`). Do not run `npm run release` or `npm publish` from memory. `PUBLISHING.md` is the written reference for the same process. **Why:** three traps below have each already caused a real incident, and none is visible from reading `package.json`.

**Trap 1 — the package name.** It is `@notyped/gitai` (scoped). **Unscoped `gitai` is a different author's real published package** (v1.0.5, similar description), so `npm view gitai version` reports a stranger's version and `npm install -g gitai@latest` overwrites the `gitai` binary with their CLI. `PUBLISHING.md` told people to do exactly that for ~6 months. Related: `src/version.ts` `name = 'gitai'` is the **Commander CLI command name**, intentionally ≠ the npm package — do NOT "fix" it (a code reviewer already flagged this as a false positive).

**Trap 2 — release notes need a repo-root `.env`.** `scripts/release-flow.ts` reads `PROVIDER`/`MODEL`/`API_KEY`/`LANGUAGE` via dotenv, **not** from `~/.gitai`, and does not validate them upfront — so a missing `.env` kills the flow _after_ it has already prompted for the release type.

**Trap 3 — green CI ≠ published.** `v1.0.8` passed tests and build, then failed on the `npm publish` step (404); npm's history still skips 1.0.7 → 1.0.9 because nobody checked. Always confirm with `npm view @notyped/gitai version` before calling a release done.

**How the pipeline works:** `npm run release` only touches git (bump → AI notes → commit → annotated tag → push). Pushing a `v*` tag triggers `.github/workflows/publish.yml`: `npm ci` → test → build → `npm pack` → `npm publish --provenance` → `gh release create`. **CI is the sole publisher — there is no local `npm publish` and no local `gh`.** Notes travel inside the annotated tag (`git tag -a -m <notes> --cleanup=verbatim`), read back in CI via `git for-each-ref --format='%(contents)'`, which keeps the AI API key OUT of CI on a public repo (requires `fetch-depth: 0`). This design exists because `gh release create` used to run locally and got skipped on manual bumps → GitHub Releases lagged npm (stuck at v1.0.7 while npm was at 1.0.9).

**A successful publish can still leave `gitai --version` old locally** — that is an install problem, not a release problem. On a machine running two Node version managers (fnm + nvm), each has its own global `node_modules`, and `npm install -g` may write to a tree the shell does not resolve — printing "added N packages" while the `gitai` on `PATH` never changes. The `release` skill carries the diagnosis.
