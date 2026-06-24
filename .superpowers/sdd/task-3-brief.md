# Task 3: skill add-provider

## Goal
Create `.claude/skills/add-provider/SKILL.md` — a guided checklist skill for adding
a new AI provider to gitai's AIService.

## Context (read CLAUDE.md for full conventions)
The project's CLAUDE.md explicitly documents this pattern:
- New providers enter the `switch` in `AIService.initializeClient()` in `src/services/ai.ts`
- New models using the OpenAI client that have reasoning capabilities use `max_completion_tokens` instead of `max_tokens` (see `isReasoningModel()`)
- Config field PROVIDER added to `src/utils/config.ts` parser
- Setup wizard updated in `src/utils/setup.ts`

## File to create

Path: `.claude/skills/add-provider/SKILL.md`

The skill must include:
1. YAML frontmatter with `name: add-provider`, `description:`, `user-invocable: false` (Claude-only, used as reference)
2. Step-by-step checklist referencing the exact files and methods:
   - Install the provider SDK: `npm install <sdk-package>`
   - Add the import in `src/services/ai.ts`
   - Add `case '<PROVIDER>':` block in `AIService.initializeClient()` switch
   - If the provider has reasoning models, add to `isReasoningModel()` check
   - Handle per-provider request params (e.g. `max_completion_tokens` vs `max_tokens`)
   - Add PROVIDER value to `src/utils/config.ts` (VALID_PROVIDERS or equivalent)
   - Add the provider to the inquirer choices in `src/utils/setup.ts`
   - Add the provider to the CLAUDE.md "Conventions" section
   - Run: `npm run lint && npm run test`
3. Reference to existing provider implementations (OpenAI, Groq, Anthropic) as patterns

## Commit
`chore: add add-provider skill for guided AI provider onboarding`

## Report
Write to `.superpowers/sdd/task-3-report.md`. Return: DONE + commit hash + one-line summary.
