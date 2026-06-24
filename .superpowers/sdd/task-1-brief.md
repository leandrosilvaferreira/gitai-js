# Task 1: block-lockfile hook

## Goal
Create `.claude/hooks/block-lockfile.mjs` and wire it in `.claude/settings.json`.

## Hook spec

File: `.claude/hooks/block-lockfile.mjs`

```js
#!/usr/bin/env node
/**
 * PreToolUse hook: block direct edits to lock files.
 * Never blocks when file is not a lock file.
 */
import fs from "node:fs";

let event = {};
try { event = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { process.exit(0); }

const file = event?.tool_input?.file_path || event?.tool_input?.path || "";

const LOCK_FILES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
];

const isLockFile = LOCK_FILES.some(name => file === name || file.endsWith("/" + name));

if (isLockFile) {
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: `Lock files must not be edited directly. Edit package.json and run 'npm install' instead.\nFile: ${file}`,
  }));
}
process.exit(0);
```

## settings.json wiring

The current PreToolUse section has two matchers:
1. `"Bash"` → guard-main-branch.mjs
2. `"Edit|Write|MultiEdit"` → secret-scan.mjs + worktree-write-guard.mjs

Add `block-lockfile.mjs` as a **third hook** inside the existing `"Edit|Write|MultiEdit"` matcher object (after worktree-write-guard):

```json
{
  "type": "command",
  "command": "node",
  "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/block-lockfile.mjs"],
  "timeout": 10
}
```

Do NOT create a new matcher object — add it to the existing `"Edit|Write|MultiEdit"` matcher's `hooks` array.

## Constraints
- ESM syntax (import/export), not CommonJS
- Read stdin for event JSON
- Exit 0 always (blocking via stdout JSON only)
- No external dependencies beyond node:fs
- Hook file has no shebang issues — follow exactly the pattern of existing hooks in .claude/hooks/

## Verification
After implementation:
1. Confirm `block-lockfile.mjs` exists in `.claude/hooks/`
2. Confirm `settings.json` has the hook in the Edit|Write|MultiEdit PreToolUse matcher
3. Run `node --input-type=module < .claude/hooks/block-lockfile.mjs` — should exit cleanly with no output (empty stdin = no event = no block)
4. Run: `echo '{"tool_input":{"file_path":"package-lock.json"}}' | node .claude/hooks/block-lockfile.mjs` — should print JSON with `decision: "block"`

## Report
Write full report to `.superpowers/sdd/task-1-report.md`.
Return: status (DONE/BLOCKED/NEEDS_CONTEXT), commit hash, one-line test summary.
