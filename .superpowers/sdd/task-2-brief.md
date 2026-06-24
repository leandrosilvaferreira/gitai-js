# Task 2: run-related-test hook

## Goal
Create `.claude/hooks/run-related-test.mjs` (PostToolUse) and wire it in `.claude/settings.json`.

## Hook spec

When Claude edits a `*.test.ts` file, immediately run just that test file via node:test.

File: `.claude/hooks/run-related-test.mjs`

```js
#!/usr/bin/env node
/**
 * PostToolUse hook: run the specific test file Claude just edited.
 * Only triggers for *.test.ts files. Never blocks. Advisory output only.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

let event = {};
try { event = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { process.exit(0); }

const file = event?.tool_input?.file_path || event?.tool_input?.path || "";

if (!file.endsWith(".test.ts")) {
  process.exit(0);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Find the node binary (respects nvm/fnm)
const binDir = path.dirname(process.execPath);
const env = { ...process.env, PATH: binDir + path.delimiter + (process.env.PATH || "") };

try {
  execSync(
    `node --import tsx --test "${file}"`,
    { cwd: projectDir, env, stdio: "inherit", timeout: 60000 }
  );
} catch {
  // Non-blocking: test failures are advisory, not blocking
}

process.exit(0);
```

## settings.json wiring

Add to the **existing** `"Edit|Write|MultiEdit"` PostToolUse matcher's `hooks` array (after `large-file-warning.mjs`):

```json
{
  "type": "command",
  "command": "node",
  "args": ["${CLAUDE_PROJECT_DIR}/.claude/hooks/run-related-test.mjs"],
  "timeout": 90
}
```

Do NOT create a new matcher object — add to the existing `"Edit|Write|MultiEdit"` PostToolUse matcher.

## Constraints
- ESM syntax (import/export), not CommonJS
- PostToolUse hook — NEVER blocks (no decision:block output)
- Only triggers for `*.test.ts` files, exits 0 immediately for all others
- Uses `node --import tsx --test "<file>"` (project's test runner pattern)
- Respects nvm/fnm via process.execPath PATH injection
- No external dependencies beyond node:fs, node:child_process, node:path
- Timeout: 90s in settings.json (tests can be slow)

## Verification
1. Confirm file exists at `.claude/hooks/run-related-test.mjs`
2. Confirm settings.json has the entry in PostToolUse Edit|Write|MultiEdit matcher
3. Test non-test-file exit: `echo '{"tool_input":{"file_path":"src/index.ts"}}' | node .claude/hooks/run-related-test.mjs` → exits cleanly, no output
4. Test empty stdin: `echo '{}' | node .claude/hooks/run-related-test.mjs` → exits cleanly

Note: cannot run a real .test.ts trigger in isolation without a test file — that's fine.

## Report
Write full report to `.superpowers/sdd/task-2-report.md`.
Return: status (DONE/BLOCKED/NEEDS_CONTEXT), commit hash, one-line test summary.
