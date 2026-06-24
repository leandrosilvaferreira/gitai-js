# Task 2: run-related-test Hook — DONE

## Summary

Successfully implemented the `run-related-test.mjs` PostToolUse hook and wired it into `.claude/settings.json`. When Claude edits a `*.test.ts` file, the hook automatically runs just that test file via `node --import tsx --test "<file>"`.

## Changes Made

### 1. Created `.claude/hooks/run-related-test.mjs`

- **Purpose**: PostToolUse hook that triggers on test file edits and runs the specific test file
- **Scope**: Only triggers for `*.test.ts` files, exits cleanly for all others
- **Safety**: Non-blocking; test failures are advisory only
- **Runtime**: Respects nvm/fnm via process.execPath PATH injection
- **Timeout**: 60s for test execution
- **Dependencies**: Node.js built-ins only (fs, child_process, path)

### 2. Updated `.claude/settings.json`

- Added hook entry to existing PostToolUse `Edit|Write|MultiEdit` matcher
- Hook configured with 90s timeout (tests can be slow)
- Placed after `sql-idempotent-review.mjs` as spec required

## Verification Results

| Check          | Status | Details                                                                                                       |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| File exists    | ✓ PASS | `.claude/hooks/run-related-test.mjs` present                                                                  |
| Settings wired | ✓ PASS | Hook entry in PostToolUse matcher with correct path and timeout                                               |
| Non-test exit  | ✓ PASS | `echo '{"tool_input":{"file_path":"src/index.ts"}}' \| node .claude/hooks/run-related-test.mjs` exits cleanly |
| Empty stdin    | ✓ PASS | `echo '{}' \| node .claude/hooks/run-related-test.mjs` exits cleanly                                          |

## Hook Behavior

When Claude edits a test file:

1. Hook receives event with `file_path` or `path` field
2. Checks if path ends with `.test.ts` → if not, exits 0 immediately
3. If test file: runs `node --import tsx --test "<file>"` in project directory
4. Catches any test failures (non-blocking)
5. Exits 0 regardless of test result

## Constraints Met

- ESM syntax (import/export) ✓
- PostToolUse only, never blocks ✓
- Triggers only for `*.test.ts` files ✓
- Uses project's test runner pattern ✓
- Respects nvm/fnm ✓
- No external dependencies ✓
- Timeout: 90s ✓

## Next Steps for Integration

The hook is ready for use. When test files are edited during development:

- The hook will automatically run the specific test file
- Test results will display in the terminal
- Failures won't block other Claude operations
- Claude can see test feedback inline
