import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkConfigExists, loadConfig, saveConfig, validateNodeVersion } from './config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpConfigPath(): string {
  return path.join(os.tmpdir(), `gitai-test-${process.pid}-${Date.now()}`);
}

function writeConfig(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, { mode: 0o600 });
}

function cleanup(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // already gone — ignore
  }
}

// ---------------------------------------------------------------------------
// loadConfig — parser key=value
// ---------------------------------------------------------------------------

test('loadConfig parses a simple KEY=value line', () => {
  const p = tmpConfigPath();
  writeConfig(p, 'LANGUAGE=en\n');
  try {
    const config = loadConfig(p);
    assert.equal(config.LANGUAGE, 'en');
  } finally {
    cleanup(p);
  }
});

test('loadConfig handles KEY=value=with=equals by rejoining on =', () => {
  const p = tmpConfigPath();
  writeConfig(p, 'API_KEY=value=with=equals\n');
  try {
    const config = loadConfig(p);
    assert.equal(config.API_KEY, 'value=with=equals');
  } finally {
    cleanup(p);
  }
});

test('loadConfig strips double quotes from value', () => {
  const p = tmpConfigPath();
  writeConfig(p, 'MODEL="gpt-4o"\n');
  try {
    const config = loadConfig(p);
    assert.equal(config.MODEL, 'gpt-4o');
  } finally {
    cleanup(p);
  }
});

test('loadConfig strips single quotes from value', () => {
  const p = tmpConfigPath();
  writeConfig(p, "PROVIDER='openai'\n");
  try {
    const config = loadConfig(p);
    assert.equal(config.PROVIDER, 'openai');
  } finally {
    cleanup(p);
  }
});

test('loadConfig accepts KEY= with empty value', () => {
  const p = tmpConfigPath();
  writeConfig(p, 'LANGUAGE=\n');
  try {
    const config = loadConfig(p);
    assert.equal(config.LANGUAGE, '');
  } finally {
    cleanup(p);
  }
});

test('loadConfig ignores lines without an equals sign', () => {
  const p = tmpConfigPath();
  writeConfig(p, 'THIS_IS_NOT_VALID\nLANGUAGE=en\n');
  try {
    const config = loadConfig(p);
    assert.equal((config as unknown as Record<string, string>)['THIS_IS_NOT_VALID'], undefined);
    assert.equal(config.LANGUAGE, 'en');
  } finally {
    cleanup(p);
  }
});

test('loadConfig ignores blank lines', () => {
  const p = tmpConfigPath();
  writeConfig(p, '\n\nLANGUAGE=en\n\n');
  try {
    const config = loadConfig(p);
    assert.equal(config.LANGUAGE, 'en');
  } finally {
    cleanup(p);
  }
});

test('loadConfig parses a file with multiple keys and returns all of them', () => {
  const p = tmpConfigPath();
  writeConfig(
    p,
    ['LANGUAGE=pt', 'PROVIDER=openai', 'API_KEY=sk-abc123', 'MODEL=gpt-4o'].join('\n') + '\n'
  );
  try {
    const config = loadConfig(p);
    assert.equal(config.LANGUAGE, 'pt');
    assert.equal(config.PROVIDER, 'openai');
    assert.equal(config.API_KEY, 'sk-abc123');
    assert.equal(config.MODEL, 'gpt-4o');
  } finally {
    cleanup(p);
  }
});

// ---------------------------------------------------------------------------
// loadConfig — file absent
// ---------------------------------------------------------------------------

test('loadConfig throws an error containing "Configuration file not found" when file is absent', () => {
  const p = tmpConfigPath(); // file never written

  assert.throws(
    () => loadConfig(p),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(
        err.message.includes('Configuration file not found'),
        `Expected message to include "Configuration file not found", got: "${err.message}"`
      );
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// checkConfigExists
// ---------------------------------------------------------------------------

test('checkConfigExists returns true when the config file exists', () => {
  const p = tmpConfigPath();
  writeConfig(p, 'LANGUAGE=en\n');
  try {
    assert.equal(checkConfigExists(p), true);
  } finally {
    cleanup(p);
  }
});

test('checkConfigExists returns false when the config file does not exist', () => {
  const p = tmpConfigPath(); // file never written
  assert.equal(checkConfigExists(p), false);
});

// ---------------------------------------------------------------------------
// saveConfig
// ---------------------------------------------------------------------------

test('saveConfig writes KEY=value lines for each config entry', () => {
  const p = tmpConfigPath();
  try {
    saveConfig({ LANGUAGE: 'en', PROVIDER: 'openai', API_KEY: 'sk-test', MODEL: 'gpt-4o' }, p);

    const raw = fs.readFileSync(p, 'utf-8');
    assert.ok(raw.includes('LANGUAGE=en'), 'Expected LANGUAGE=en in file');
    assert.ok(raw.includes('PROVIDER=openai'), 'Expected PROVIDER=openai in file');
    assert.ok(raw.includes('API_KEY=sk-test'), 'Expected API_KEY=sk-test in file');
    assert.ok(raw.includes('MODEL=gpt-4o'), 'Expected MODEL=gpt-4o in file');
  } finally {
    cleanup(p);
  }
});

test('saveConfig round-trips: written file can be read back to the original config', () => {
  const p = tmpConfigPath();
  try {
    const original = { LANGUAGE: 'pt', PROVIDER: 'groq', API_KEY: 'gsk-abc', MODEL: 'llama3' };
    saveConfig(original, p);

    const loaded = loadConfig(p);
    assert.deepEqual(loaded, original);
  } finally {
    cleanup(p);
  }
});

// ---------------------------------------------------------------------------
// validateNodeVersion
// ---------------------------------------------------------------------------

test('validateNodeVersion returns true for the current Node.js version (>=20 required)', () => {
  assert.equal(validateNodeVersion(), true);
});
