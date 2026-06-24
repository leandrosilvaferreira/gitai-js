#!/usr/bin/env node
/**
 * PostToolUse hook: run the specific test file Claude just edited.
 * Only triggers for *.test.ts files. Never blocks. Advisory output only.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

let event = {};
try {
  event = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}

const file = event?.tool_input?.file_path || event?.tool_input?.path || '';

if (!file.endsWith('.test.ts')) {
  process.exit(0);
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Find the node binary (respects nvm/fnm)
const binDir = path.dirname(process.execPath);
const env = { ...process.env, PATH: binDir + path.delimiter + (process.env.PATH || '') };

try {
  execSync(`node --import tsx --test "${file}"`, {
    cwd: projectDir,
    env,
    stdio: 'inherit',
    timeout: 60000,
  });
} catch {
  // Non-blocking: test failures are advisory, not blocking
}

process.exit(0);
