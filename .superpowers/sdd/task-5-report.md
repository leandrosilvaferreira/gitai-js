# Task 5: Release Validator Agent — Completion Report

## Summary

Created `.claude/agents/release-validator.md` — a specialized subagent for validating pre-release conditions before executing the @notyped/gitai release workflow.

## What Was Built

**File:** `.claude/agents/release-validator.md`

A comprehensive agent definition that instructs Claude to systematically validate all 7 pre-release conditions:

1. **Check uncommitted changes** — `git status --porcelain` (must be empty)
2. **Check branch** — `git branch --show-current` (must be `main` or `master`)
3. **Read current version** — Extract from `package.json`
4. **Check NPM registry** — `npm view @notyped/gitai@<version> version` (must be empty = not published)
5. **Check git tag** — `git tag -l v<version>` (must be empty = tag doesn't exist)
6. **Run tests** — `npm run test` (must exit 0)
7. **Run build** — `npm run build` (must exit 0, checks dist/ output)

## Agent Configuration

- **Name:** `release-validator`
- **Model:** `haiku` (cost-optimized, sufficient for validation logic)
- **Tools:** `Read, Bash` (file reading + command execution only)
- **Description:** Validates pre-release conditions for the @notyped/gitai npm package before release

## Report Format

The agent outputs:

```
[PASS] <check-name>
[FAIL] <check-name>: <reason>
```

Final summary:

- All pass: `✅ Ready to release vX.Y.Z`
- Any fail: `❌ Release blocked: [numbered list of failures]`

## Design Rationale

### Aligned with release-flow.ts

The agent's checks mirror the actual validation in `scripts/release-flow.ts`:

- Line 27-30: Checks uncommitted changes via `hasUncommittedChanges()`
- Line 33-45: Checks branch (main/master)
- Line 48: Reads version from `pkg.version`
- Line 87-98: Handles git tags via `git describe --tags --abbrev=0`

### Minimal but Complete

- No unnecessary dependencies (uses only bash and file reads)
- Provides all critical blockers before release
- Executes sequential checks (later checks may depend on earlier results)
- Reports all failures together (actionable feedback)

### Haiku Model Selection

- Validation logic is straightforward (no complex reasoning needed)
- Simple sequencing of 7 checks
- Minimal token overhead vs. Sonnet
- ~3x cost savings suitable for frequent pre-release validations

## Usage

### Invoke via Agent tool:

```
Agent({
  description: "Pre-release validation for gitai-js",
  subagent_type: "release-validator",
  prompt: "Validate release readiness for @notyped/gitai"
})
```

### Or via workflow hook (if automated):

- Before `npm run release`
- Before git push of release tag
- In CI/CD pre-release gates

## Integration Points

1. **scripts/release-flow.ts** — Can be called before user prompts to confirm version
2. **CI/CD Pipeline** — Pre-release gate before npm publish trigger
3. **Development Workflow** — Manual check before `npm run release`

## Files Modified

- ✅ Created: `.claude/agents/release-validator.md` (130 lines)

## Testing Strategy

The agent itself requires no unit tests (it's a prompt specification). However, it can be validated by:

1. Running it against a dirty working directory (should fail check 1)
2. Running it on a non-main branch (should fail check 2)
3. Running it after a release is already published (should fail check 4)
4. Running it with failing tests (should fail check 6)
5. Running it with a broken build (should fail check 7)

## Notes

- **Immutability:** Agent doesn't modify files, only reads and executes validation
- **Safety:** Uses `reject:false` semantics implicitly (handles command failures gracefully)
- **Clarity:** Each check has explicit pass/fail conditions and actionable failure messages
- **Completeness:** Covers all blockers from release-flow.ts plus npm registry check (extra safety)

---

**Status:** ✅ COMPLETE  
**Commit:** `chore: add release-validator agent for pre-release condition checks`
