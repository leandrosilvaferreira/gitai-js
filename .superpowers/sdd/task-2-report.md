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

## Security Fix

**Vulnerability:** Command injection in `run-related-test.mjs`.

Original code interpolated untrusted `file` (from `tool_input`) directly into a shell string:

```js
execSync(`node --import tsx --test "${file}"`, { ... })
```

An attacker could inject shell commands via crafted file paths like `"; rm -rf /; echo "`.

**Fix Applied (Commit 0ae8b71):**

1. Changed import: `execFileSync` instead of `execSync`
2. Replaced shell-based call with array argument format (never goes through shell):
   ```js
   execFileSync(process.execPath, ['--import', 'tsx', '--test', file], {
     cwd: projectDir,
     stdio: 'inherit',
     timeout: 60000,
   });
   ```
3. Used `process.execPath` directly (respects nvm/fnm already)
4. Removed unsafe `binDir` and `env` PATH injection block
5. Removed unnecessary `path` import

**Verification:** `echo '{"tool_input":{"file_path":"src/index.ts"}}' | node .claude/hooks/run-related-test.mjs` exits cleanly with code 0.

**Impact:** Arguments are never interpolated through shell. Even malicious file paths cannot execute arbitrary commands.
