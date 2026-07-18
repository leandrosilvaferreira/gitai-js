---
name: release
description: Use when publishing a new version of gitai to npm — cutting a release, bumping the version, shipping to the registry — or when a release was cut but the new version never reached npm, or a user reports the CLI still showing an old version.
---

# Release — gitai (`@notyped/gitai`)

Interactive release for this package. Follow this skill instead of running release commands from memory — three of the gotchas below have each already caused a real incident in this repo.

**The one fact that governs everything: you never publish. CI does.** `npm run release` only touches git (bump → AI notes → commit → annotated tag → push). Pushing a `v*` tag is what triggers `.github/workflows/publish.yml`, which runs `npm publish --provenance` **and** creates the GitHub Release. No local `npm publish`, no local `gh` in this flow.

## The package name — using the wrong one damages the machine

The package is **`@notyped/gitai`**, always scoped.

**`gitai` unscoped is a different author's real, published package.** `npm view gitai version` reports _their_ version; `npm install -g gitai@latest` installs _their_ CLI over the `gitai` binary. Never use the unscoped name in any command.

`src/version.ts` exports `name = 'gitai'` — that is the **Commander CLI command name**, deliberately ≠ the package name. Do not "fix" it.

## Preconditions

Dispatch the `release-validator` agent — it checks clean tree, branch, tests, build, and tag availability. Then confirm the one thing it does not:

**`.env` must exist at the repo root** with `PROVIDER`, `MODEL`, `API_KEY`, `LANGUAGE` (see `.env.sample`). `scripts/release-flow.ts` reads these via dotenv — **not** from `~/.gitai` — to generate release notes, and does not validate them upfront. Without it the flow dies _after_ it has already prompted you.

```bash
test -f .env && echo ok || echo "MISSING — cp .env.sample .env and fill it"
git log $(git describe --tags --abbrev=0)..HEAD --oneline   # what's shipping
```

## Run

```bash
npm run release
```

Prompts, in order:

1. **Release type** — `patch` / `minor` / `major` / `custom`. Nothing infers this from commit prefixes; you choose, using the `git log` above.
2. **Review the AI-generated notes.**
3. **Push branch + tag to origin?** → **yes**, or nothing ships.

It writes `package.json`, `src/version.ts`, `CHANGELOG.md`; commits `chore: release vX.Y.Z`; creates an annotated tag carrying the notes. CI reads the notes back out of that tag — that is how rich release notes reach GitHub with no AI key in CI.

Declined the push? Nothing has shipped yet:

```bash
git push origin main && git push origin vX.Y.Z
```

## Verify — mandatory, not ceremony

**A green CI run does not prove the package published.** In this repo, `v1.0.8` passed tests and build, then failed on the `npm publish` step (404); npm's history still skips 1.0.7 → 1.0.9 because nobody noticed. Always confirm against the registry itself:

```bash
gh run list -R leandrosilvaferreira/gitai-js --workflow=publish.yml --limit 1
npm view @notyped/gitai version      # MUST equal the version you just cut
gh release list -R leandrosilvaferreira/gitai-js --limit 1
```

CI takes ~30s. If `npm view` disagrees with the tag, the release did not land — treat it as failed and investigate the run's `npm publish` step.

## Troubleshooting

| Symptom                                         | Cause / fix                                                                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Aborts immediately                              | Uncommitted changes — notes come from committed history. Commit first.                                                                         |
| Dies while generating notes                     | Missing/incomplete `.env` (see Preconditions).                                                                                                 |
| Tag already exists                              | `git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z`, then re-run.                                                                         |
| CI never ran                                    | Tag never reached origin: `git push origin vX.Y.Z`.                                                                                            |
| CI green but `npm view` shows the old version   | Publish step failed — the `v1.0.8` case. Read the run log; re-cut a new patch version (npm forbids republishing a version, even a failed one). |
| npm has it, GitHub Release missing              | Publish succeeded, `gh release create` failed. Recover: `gh release create <tag> --title "Release <tag>" --notes-file notes.md <tarball>`      |
| Published, but `gitai --version` is old locally | Not a release problem — see below.                                                                                                             |

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
- Declare a release done on a green CI run alone — confirm with `npm view`.
