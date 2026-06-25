import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { readClaudeSettings } from './claude-settings.js';

function makeDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-claude-settings-'));
}

function writeJson(dir: string, filename: string, obj: unknown): void {
  fs.writeFileSync(path.join(dir, filename), JSON.stringify(obj), 'utf-8');
}

test('readClaudeSettings returns {} when directory does not exist', () => {
  const result = readClaudeSettings('/nonexistent/path/that/cannot/exist');
  assert.deepEqual(result, {});
});

test('readClaudeSettings returns {} when settings.json is absent', () => {
  const dir = makeDir();
  try {
    const result = readClaudeSettings(dir);
    assert.deepEqual(result, {});
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readClaudeSettings returns {} when settings.json contains invalid JSON', () => {
  const dir = makeDir();
  try {
    fs.writeFileSync(path.join(dir, 'settings.json'), 'NOT_JSON', 'utf-8');
    const result = readClaudeSettings(dir);
    assert.deepEqual(result, {});
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readClaudeSettings returns {} when settings.json has no env field', () => {
  const dir = makeDir();
  try {
    writeJson(dir, 'settings.json', { other: 'value' });
    const result = readClaudeSettings(dir);
    assert.deepEqual(result, {});
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readClaudeSettings extracts ANTHROPIC_AUTH_TOKEN from settings.json', () => {
  const dir = makeDir();
  try {
    writeJson(dir, 'settings.json', { env: { ANTHROPIC_AUTH_TOKEN: 'token-abc' } });
    const result = readClaudeSettings(dir);
    assert.equal(result.ANTHROPIC_AUTH_TOKEN, 'token-abc');
    assert.equal(result.ANTHROPIC_BASE_URL, undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readClaudeSettings extracts ANTHROPIC_BASE_URL from settings.json', () => {
  const dir = makeDir();
  try {
    writeJson(dir, 'settings.json', { env: { ANTHROPIC_BASE_URL: 'https://proxy.example.com' } });
    const result = readClaudeSettings(dir);
    assert.equal(result.ANTHROPIC_BASE_URL, 'https://proxy.example.com');
    assert.equal(result.ANTHROPIC_AUTH_TOKEN, undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readClaudeSettings extracts both fields when present in settings.json', () => {
  const dir = makeDir();
  try {
    writeJson(dir, 'settings.json', {
      env: {
        ANTHROPIC_AUTH_TOKEN: 'token-abc',
        ANTHROPIC_BASE_URL: 'https://proxy.example.com',
      },
    });
    const result = readClaudeSettings(dir);
    assert.equal(result.ANTHROPIC_AUTH_TOKEN, 'token-abc');
    assert.equal(result.ANTHROPIC_BASE_URL, 'https://proxy.example.com');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readClaudeSettings: settings.local.json overrides settings.json values', () => {
  const dir = makeDir();
  try {
    writeJson(dir, 'settings.json', {
      env: {
        ANTHROPIC_AUTH_TOKEN: 'base-token',
        ANTHROPIC_BASE_URL: 'https://base.example.com',
      },
    });
    writeJson(dir, 'settings.local.json', {
      env: {
        ANTHROPIC_AUTH_TOKEN: 'local-token',
      },
    });
    const result = readClaudeSettings(dir);
    assert.equal(result.ANTHROPIC_AUTH_TOKEN, 'local-token');
    assert.equal(result.ANTHROPIC_BASE_URL, 'https://base.example.com');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readClaudeSettings: settings.local.json with invalid JSON falls back to settings.json', () => {
  const dir = makeDir();
  try {
    writeJson(dir, 'settings.json', { env: { ANTHROPIC_AUTH_TOKEN: 'base-token' } });
    fs.writeFileSync(path.join(dir, 'settings.local.json'), 'INVALID', 'utf-8');
    const result = readClaudeSettings(dir);
    assert.equal(result.ANTHROPIC_AUTH_TOKEN, 'base-token');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('readClaudeSettings only reads settings.local.json when settings.json is absent', () => {
  const dir = makeDir();
  try {
    writeJson(dir, 'settings.local.json', {
      env: { ANTHROPIC_AUTH_TOKEN: 'local-only-token' },
    });
    const result = readClaudeSettings(dir);
    assert.equal(result.ANTHROPIC_AUTH_TOKEN, 'local-only-token');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
