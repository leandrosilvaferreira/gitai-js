#!/usr/bin/env node
/**
 * PreToolUse hook: block direct edits to lock files.
 * Never blocks when file is not a lock file.
 */
import fs from 'node:fs';

let event = {};
try {
  event = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}

const file = event?.tool_input?.file_path || event?.tool_input?.path || '';

const LOCK_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];

const isLockFile = LOCK_FILES.some((name) => file === name || file.endsWith('/' + name));

if (isLockFile) {
  process.stdout.write(
    JSON.stringify({
      decision: 'block',
      reason: `Lock files must not be edited directly. Edit package.json and run 'npm install' instead.\nFile: ${file}`,
    })
  );
}
process.exit(0);
