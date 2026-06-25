# gitai-js

> Project memory for Claude Code. Keep this file short and high-signal —
> bloated memory gets ignored. Put hard guarantees in hooks, not prose.

## Stack

TypeScript, JavaScript · npm

Architecture: **layered**.

## Canonical commands

Always use these exact commands (do not guess):

- **Install:** `npm install`
- **Lint:** `npm run lint`
- **Format:** `npm run format`
- **Typecheck:** `npx tsc --noEmit`
- **Test:** `npm run test`
- **Build:** `npm run build`
- **Run/Dev:** `npm run dev`

> **Tests:** `node:test` — run `npm run test`. Write unit tests for **every** new function or module added; never declare work complete without passing tests.

## Workflow & Agents

Every non-trivial implementation: invoke `superpowers:subagent-driven-development`.
When dispatching subagents, you MUST use the corresponding specialist agent from the table below — never the generic agent when a specialist is listed. Match the task type to the "When to use" column and pass the exact name as `subagent_type`.

| Agent                    | When to use                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `orchestrator`           | multi-agent or cross-domain tasks — dispatch THIS one to sub-delegate; never dispatch generic agents directly |
| `code-reviewer`          | review after any code change                                                                                  |
| `security-reviewer`      | security review before merge                                                                                  |
| `typescript-reviewer`    | TypeScript/JavaScript code review                                                                             |
| `qa-automation-engineer` | E2E, QA automation, Playwright/Cypress                                                                        |
| `test-engineer`          | unit tests, integration, code coverage                                                                        |
| `database-architect`     | schema, migrations, queries, data modeling                                                                    |
| `devops-engineer`        | deploy, CI/CD, infra, production                                                                              |
| `backend-specialist`     | API, server-side logic, database integration                                                                  |
| `performance-optimizer`  | performance optimization, profiling                                                                           |
| `product-manager`        | product decisions, prioritization, roadmap                                                                    |
| `product-owner`          | backlog refinement, acceptance criteria                                                                       |
| `project-planner`        | feature planning, task decomposition                                                                          |
| `code-archaeologist`     | understanding legacy code, refactoring                                                                        |
| `debugger`               | complex bug debugging, root cause analysis                                                                    |
| `explorer-agent`         | unknown codebase exploration, mapping                                                                         |
| `documentation-writer`   | only when documentation is explicitly requested                                                               |
| `penetration-tester`     | pentest, vulnerabilities, offensive security                                                                  |
| `security-auditor`       | security audit, SAST, defensive review                                                                        |

### Superpowers Skills → Project Specialists (Mandatory Bridging)

Superpowers skills (`dispatching-parallel-agents`, `subagent-driven-development`, `executing-plans`, `systematic-debugging`) default to `general-purpose` in their examples. **NEVER use `general-purpose`** when a specialist covers the domain — always replace with one from the table above.

> Rationale: superpowers itself declares "User's explicit instructions (CLAUDE.md) — highest priority". This section applies that priority over agent types suggested by skills.

**Correct flow with superpowers:**

1. Skill identifies independent domains → main maps each to the specialist from the table
2. Dispatch with `subagent_type: "<specialist>"` in Agent tool
3. Integrate results normally

## Architecture map

CLI (`gitai`) that generates Conventional commits via AI. Single-pass flow; no on-disk state beyond `~/.gitai`.

- `src/index.ts` — Commander entrypoint. Orchestrates: loads config (or runs setup) → `chdir` to target project → detects changes → generates diff → requests commit message from AI → commits → `git pull` → re-commits post-pull → optional push (`--push`).
- `src/services/ai.ts` — `AIService`: sole abstraction over OpenAI/Groq/Anthropic. Exposes `generateCommitMessage()` and `generateReleaseNotes()`; centralizes prompt engineering. Consumes `logger`.
- `src/utils/git.ts` — all git interaction via `execa` (`runGitCommand`). `getDiffWithNewFiles()` stages before diff; `getDeletedFiles()`, bilingual conflict detection (EN+PT), commit via temp file.
- `src/utils/config.ts` — global config `~/.gitai` (mode `0o600`), key=value parser, LANGUAGE/PROVIDER/API_KEY/MODEL fields; `validateNodeVersion()` (Node ≥18).
- `src/utils/setup.ts` — interactive wizard (`inquirer`); reuses existing values on re-run.
- `src/utils/language.ts` — `detectProjectLanguage()` + `printDetectedLanguage()` (passed to AI as context).
- `src/utils/logger.ts` — `chalk`+emoji logger (header/success/info/warning/error/git/ai/commit). Sole output channel to the user.
- `src/releaser.ts` — separate CLI: release notes from `git log` since a tag; uses environment variables (`.env`), not `~/.gitai`; writes `dist/release_<version>.md`.
- `src/version.ts` — re-exports `name`/`version`/`engines` from package.json.
- `scripts/release-flow.ts` — automated release workflow (`tsx`); `scripts/verify_deleted_files_logic.ts` — manual verification script.

Domain-specific guidance lives in nested CLAUDE.md files (loaded on demand):

- `src/services/` — external integration services layer (AI clients)

## Conventions

- **Pure ESM** (`"type": "module"`): every relative import MUST end in `.js`, even when pointing to a `.ts` source (e.g., `import { logger } from './logger.js'`). Without this the runtime breaks.
- **`process.exit(1)` on fatal error is intentional** (eslint rule `no-process-exit` disabled) — this is a CLI. Errors go to `logger.error` (chalk), not raw `throw` to the user.
- **New AI providers** enter the `switch` in `AIService.initializeClient()` + per-provider request handling (new OpenAI models use `max_completion_tokens` instead of `max_tokens`).
- **Git only via `runGitCommand()`** (`execa`, `reject:false`). Commit message is written to a temp file (preserves special characters); status/conflict detection must cover git output in both English AND Portuguese.
- **Staging before diff**: `getDiffWithNewFiles()` runs `git add .` + `git diff --cached` so AI sees new files; deleted files come separately via `getDeletedFiles()`.
- **Strict Conventional Commits**: only `feat`/`fix`/`docs`/`chore` prefixes, enforced by the prompt in `getCommitSystemPrompt()`.
- **User output only via the `logger` object** (`src/utils/logger.ts`) — never raw `console.log` in new code.

## Behavioral guidelines

<!-- aia-harness:behavioral — non-negotiable; do not edit, reorder, or remove during enrichment -->

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## Engineering rules

<!-- aia-harness:fixed — non-negotiable; do not edit, reorder, or remove during enrichment -->

- Match the style of surrounding code; do not introduce new patterns unprompted.
- Write unit tests for every new function or module added.
- Run the lint + test commands above before claiming work is complete.
- Never commit secrets; keep them in gitignored env files (`.env`/`.env.local`) — `.claude/settings.local.json` is only for MCP-server credentials referenced by `.mcp.json`.
- Fix every compilation/syntax/lint error found during a session — regardless of whether you edited the file. Never leave the build broken or label errors "pre-existing, not related".
- When performing a code review (user requests it or a workflow triggers it), always use `code-reviewer` and `security-reviewer` and `typescript-reviewer`.

@.claude/memory/INSTRUCTIONS.md
@.claude/memory/MEMORY.md

<!-- Generated by aia-harness. Edit freely; re-run /aia-harness:doctor to audit. -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
