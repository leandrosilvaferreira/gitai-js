# Task 1: block-lockfile hook — Implementation Report

## Summary

Successfully created `.claude/hooks/block-lockfile.mjs` and wired it into `.claude/settings.json` as a PreToolUse hook for Edit/Write/MultiEdit operations.

## Files Created

- **`.claude/hooks/block-lockfile.mjs`** (762 bytes)
  - ESM syntax with `import` from `node:fs`
  - Reads event JSON from stdin
  - Checks `tool_input.file_path` and `tool_input.path` fields
  - Blocks edits to: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`
  - Outputs JSON with `decision: "block"` when lock file detected
  - Always exits with code 0 (blocking via stdout JSON only)

## Files Modified

- **`.claude/settings.json`**
  - Added hook entry to the existing `Edit|Write|MultiEdit` PreToolUse matcher
  - Positioned as third hook (after secret-scan.mjs and worktree-write-guard.mjs)
  - Configuration:
    ```json
    {
      "type": "command",
      "command": "node",
      "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/block-lockfile.mjs"],
      "timeout": 10
    }
    ```

## Verification Results

### 1. File existence check

```bash
$ ls -la .claude/hooks/block-lockfile.mjs
644  .claude/hooks/block-lockfile.mjs  762B
```

✓ Hook file exists with correct permissions

### 2. Settings.json wiring check

```bash
$ grep -A 20 '"Edit|Write|MultiEdit"' .claude/settings.json
# Shows block-lockfile.mjs in the hooks array as the third entry
```

✓ Hook properly wired in Edit|Write|MultiEdit matcher

### 3. Empty stdin test (non-blocking case)

```bash
$ echo "" | node .claude/hooks/block-lockfile.mjs
# No output, exit code 0
```

✓ Correctly exits cleanly with no output when stdin is empty

### 4. Lock file blocking test (package-lock.json)

```bash
$ echo '{"tool_input":{"file_path":"package-lock.json"}}' | node .claude/hooks/block-lockfile.mjs
{"decision":"block","reason":"Lock files must not be edited directly. Edit package.json and run 'npm install' instead.\nFile: package-lock.json"}
```

✓ Correctly blocks with JSON response for package-lock.json

### 5. Non-lock file test (no blocking)

```bash
$ echo '{"tool_input":{"file_path":"src/index.ts"}}' | node .claude/hooks/block-lockfile.mjs
# No output, exit code 0
```

✓ Correctly does not block non-lock files

### 6. Alternative lock file test (yarn.lock via path field)

```bash
$ echo '{"tool_input":{"path":"yarn.lock"}}' | node .claude/hooks/block-lockfile.mjs
{"decision":"block","reason":"Lock files must not be edited directly. Edit package.json and run 'npm install' instead.\nFile: yarn.lock"}
```

✓ Correctly blocks yarn.lock using alternative `path` field

## Constraints Met

- ✓ ESM syntax (import from node:fs only)
- ✓ Reads stdin for event JSON
- ✓ Exits 0 always (blocking via stdout JSON only)
- ✓ No external dependencies beyond node:fs
- ✓ Follows existing hook patterns in `.claude/hooks/`
- ✓ No DO NOT create new matcher — added to existing Edit|Write|MultiEdit matcher

## Ready for Commit

All verification passed. Ready to commit with message:

```
chore: add block-lockfile hook to prevent direct lock file edits
```
