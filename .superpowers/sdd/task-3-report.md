# Task 3 Report — add-provider Skill

## Status: DONE

**Commit:** `f62c2bc` — chore: add add-provider skill for guided AI provider onboarding

## Summary

Created `.claude/skills/add-provider/SKILL.md` — a concrete, actionable reference skill for onboarding new AI providers into gitai's `AIService` abstraction layer.

## What Was Delivered

The skill provides:

1. **YAML frontmatter** with name, description, and `user-invocable: false` (Claude-only reference)

2. **12-step checklist** with exact file paths, line numbers, and code patterns:
   - SDK installation via npm
   - Import and property declaration in `AIService` (lines 1–22)
   - Provider case in `initializeClient()` switch (lines 29–43)
   - API call handling in `callApi()` method (lines 207–268)
   - Reasoning model detection (`isReasoningModel()` at lines 14–16)
   - Config parser integration
   - Setup wizard choices and model defaults (lines 71–103)
   - CLAUDE.md conventions documentation
   - Verification via `tsc`, `lint`, `format`
   - Optional integration tests and manual testing

3. **Concrete references** to existing providers (OpenAI, Groq, Anthropic) as patterns, including:
   - Parameter handling (e.g., `max_completion_tokens` vs `max_tokens`)
   - Response structure extraction
   - Reasoning model API variant (Responses API)
   - Logger usage pattern

4. **Common pitfalls table** with solutions

5. **Final checklist** for code review

## Code Quality

- All references point to actual source locations (absolute paths + line numbers)
- Examples match the exact style and patterns found in the codebase
- Skill assumes no prior knowledge of the architecture but requires technical setup competence
- No generic advice; every step is rooted in the actual implementation

## Verification

- Created file at correct path: `.claude/skills/add-provider/SKILL.md`
- Committed with conventional commit message
- No breaking changes to existing code
- File follows SKILL.md naming convention for Claude Code skills
