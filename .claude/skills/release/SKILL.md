---
name: release
description: Use when publishing a new version of gitai to npm — cutting a release, bumping the version, shipping to the registry — or when a release was cut but the new version never reached npm, or a user reports the CLI still showing an old version.
---

# Release — gitai (`@notyped/gitai`)

**Start here, always:**

```bash
npm run release:status
```

Read-only. It prints local version, npm version, last tag, unreleased commit count, and a verdict with the exact next command. Most release questions — including _"I committed and pushed but no new version appeared"_ — are answered by this one command. Do not diagnose by hand.

**The fact that governs everything: you never publish. CI does.** `npm run release` only touches git (bump → AI notes → commit → annotated tag → push). Pushing a `v*` tag triggers `.github/workflows/publish.yml`, which runs `npm publish --provenance` **and** creates the GitHub Release. There is no local `npm publish`, and nothing here needs `gh` to publish — `gh` is read-only and optional, used by `release:status` to show the CI run. Without it the status still works; the CI line just reads as unknown.

Corollary, and the single most common misunderstanding: **`git push` of commits publishes nothing.** Only a `v*` tag does.

## Cut a release

Fully automatic — no prompts, verifies against npm before returning:

```bash
npm run release -- --type auto --yes
```

**Confirm before passing `--yes`.** Publishing is irreversible and public: npm forbids reusing a version, even one whose publish failed. Show the user what is shipping (`git log <last-tag>..HEAD --oneline`) and the inferred bump, and get an explicit go-ahead for both. Without one, use `--no-push` and report what is staged locally — that leaves the commit and tag on the machine and publishes nothing.

`--type auto` infers the bump from Conventional Commits since the last tag: a `!` marker or `BREAKING CHANGE` → major, any `feat:` → minor, otherwise patch. The flow prints what it inferred before acting.

| Flag                                 | Effect                                      |
| ------------------------------------ | ------------------------------------------- |
| `--type <patch\|minor\|major\|auto>` | Pick the bump without prompting             |
| `--version <x.y.z>`                  | Cut an explicit version (must be > current) |
| `--yes`                              | Push without asking                         |
| `--no-push`                          | Commit and tag locally, stop before pushing |
| `--status`                           | Diagnose only, change nothing               |

Omit the flags for the interactive wizard; it pre-selects the inferred bump. **Never drive the wizard by piping keystrokes** — arrow-key sequences depend on choice order, so one added option silently cuts the wrong version. Use the flags.

Running non-interactively without `--type`/`--version`, or without `--yes`/`--no-push`, exits with a message telling you which flag to add. That is deliberate, not a failure.

`--yes` authorises the **push**, not the branch: a non-interactive run off `main`/`master` always refuses, because there is no human to confirm and those commits would feed the release notes. Release from `main`, or run interactively.

## What the flow guarantees

These were manual checklist items that each caused a real incident; they are now enforced in code, so you do not verify them by hand:

- **`.env` is checked before any prompt.** Release notes come from a repo-root `.env` (`PROVIDER`/`MODEL`/`API_KEY`/`LANGUAGE`, see `.env.sample`) via dotenv — **not** from `~/.gitai`. Missing keys fail in one second.
- **A colliding tag fails before the AI call**, so a retry costs nothing.
- **The publish is verified against the npm registry** after the push. The flow polls until `npm view` reports the new version and exits non-zero if it never lands. A green CI run alone is _not_ proof — `v1.0.8` passed tests and build, then 404'd on `npm publish`, and npm's history still skips 1.0.7 → 1.0.9 because nobody checked.
- Clean tree, branch, `npm test`, `npm run build` all run before anything is written.

## The package name — using the wrong one damages the machine

The package is **`@notyped/gitai`**, always scoped.

**`gitai` unscoped is a different author's real, published package.** `npm view gitai version` reports _their_ version; `npm install -g gitai@latest` installs _their_ CLI over the `gitai` binary. Never use the unscoped name in any command.

`src/version.ts` exports `name = 'gitai'` — that is the **Commander CLI command name**, deliberately ≠ the package name. Do not "fix" it.

## Troubleshooting

| Symptom                                         | Cause / fix                                                                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Committed and pushed, no new version            | Normal. Commits do not publish. `npm run release:status`, then cut a release.                                                                   |
| Aborts immediately                              | Uncommitted changes — notes come from committed history. Commit first.                                                                          |
| `Missing PROVIDER, MODEL, …`                    | Repo-root `.env` absent or incomplete: `cp .env.sample .env` and fill it.                                                                       |
| `Tag vX.Y.Z already exists`                     | `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`, then re-run.                                                                          |
| `Non-interactive run needs --type …`            | Add `--type auto` (and `--yes` or `--no-push`).                                                                                                 |
| CI never ran                                    | Tag never reached origin: `git push origin vX.Y.Z`.                                                                                             |
| Flow reports the publish did not land           | Read the run log (`gh run list --workflow=publish.yml --limit 1`); cut a **new patch** — npm forbids republishing a version, even a failed one. |
| npm has it, GitHub Release missing              | Publish succeeded, `gh release create` failed. Recover: `gh release create <tag> --title "Release <tag>" --notes-file notes.md <tarball>`       |
| Published, but `gitai --version` is old locally | Not a release problem — see below.                                                                                                              |

## "It published, but my machine still shows the old version"

If `npm view @notyped/gitai version` shows the new version, the release worked; the problem is the local install.

On a machine with more than one Node version manager (fnm **and** nvm, say), each has its own global `node_modules`. `npm install -g` can write to a different tree than the shell actually resolves — printing "added N packages" while the `gitai` on `PATH` never changes.

```bash
which gitai && gitai --version
npm root -g          # may NOT be the tree your shell's gitai came from
```

Install into the tree that owns the binary, then verify by reading the file — not by trusting the install output:

```bash
npm install -g --prefix "<that-tree-prefix>" @notyped/gitai@latest
grep '"version"' "<that-tree>/lib/node_modules/@notyped/gitai/package.json"
```

## Never

- Run `npm publish` by hand — CI owns publishing, and a manual publish loses provenance.
- Reuse or force-push a published version — cut a new patch instead.
- Use the unscoped `gitai` name in any command.
- Drive the interactive wizard with piped keystrokes — pass flags.
