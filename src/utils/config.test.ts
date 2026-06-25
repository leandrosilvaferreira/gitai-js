import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { checkConfigExists, loadConfig, saveConfig, validateNodeVersion } from './config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function writeConfig(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, { mode: 0o600 });
}

// ---------------------------------------------------------------------------
// loadConfig — parser key=value
// ---------------------------------------------------------------------------

test('loadConfig parses a simple KEY=value line', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    writeConfig(p, 'LANGUAGE=en\n');
    const config = loadConfig(p);
    assert.equal(config.LANGUAGE, 'en');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig handles KEY=value=with=equals by rejoining on =', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    writeConfig(p, 'API_KEY=value=with=equals\n');
    const config = loadConfig(p);
    assert.equal(config.API_KEY, 'value=with=equals');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig strips double quotes from value', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    writeConfig(p, 'MODEL="gpt-4o"\n');
    const config = loadConfig(p);
    assert.equal(config.MODEL, 'gpt-4o');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig strips single quotes from value', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    writeConfig(p, "PROVIDER='openai'\n");
    const config = loadConfig(p);
    assert.equal(config.PROVIDER, 'openai');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig accepts KEY= with empty value', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    writeConfig(p, 'LANGUAGE=\n');
    const config = loadConfig(p);
    assert.equal(config.LANGUAGE, '');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig ignores lines without an equals sign', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    writeConfig(p, 'THIS_IS_NOT_VALID\nLANGUAGE=en\n');
    const config = loadConfig(p);
    assert.equal((config as unknown as Record<string, string>)['THIS_IS_NOT_VALID'], undefined);
    assert.equal(config.LANGUAGE, 'en');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig ignores blank lines', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    writeConfig(p, '\n\nLANGUAGE=en\n\n');
    const config = loadConfig(p);
    assert.equal(config.LANGUAGE, 'en');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig parses a file with multiple keys and returns all of them', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    writeConfig(
      p,
      ['LANGUAGE=pt', 'PROVIDER=openai', 'API_KEY=sk-abc123', 'MODEL=gpt-4o'].join('\n') + '\n'
    );
    const config = loadConfig(p);
    assert.equal(config.LANGUAGE, 'pt');
    assert.equal(config.PROVIDER, 'openai');
    assert.equal(config.API_KEY, 'sk-abc123');
    assert.equal(config.MODEL, 'gpt-4o');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// loadConfig — file absent
// ---------------------------------------------------------------------------

test('loadConfig throws an error containing "Configuration file not found" when file is absent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config'); // file never written
  try {
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
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// checkConfigExists
// ---------------------------------------------------------------------------

test('checkConfigExists returns true when the config file exists', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    writeConfig(p, 'LANGUAGE=en\n');
    assert.equal(checkConfigExists(p), true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('checkConfigExists returns false when the config file does not exist', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config'); // file never written
  try {
    assert.equal(checkConfigExists(p), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// saveConfig
// ---------------------------------------------------------------------------

test('saveConfig writes KEY=value lines for each config entry', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    saveConfig({ LANGUAGE: 'en', PROVIDER: 'openai', API_KEY: 'sk-test', MODEL: 'gpt-4o' }, p);

    const raw = fs.readFileSync(p, 'utf-8');
    assert.ok(raw.includes('LANGUAGE=en'), 'Expected LANGUAGE=en in file');
    assert.ok(raw.includes('PROVIDER=openai'), 'Expected PROVIDER=openai in file');
    assert.ok(raw.includes('API_KEY=sk-test'), 'Expected API_KEY=sk-test in file');
    assert.ok(raw.includes('MODEL=gpt-4o'), 'Expected MODEL=gpt-4o in file');

    const stat = fs.statSync(p);
    assert.equal(stat.mode & 0o777, 0o600, 'Config file must be owner-read/write only (0o600)');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('saveConfig round-trips: written file can be read back to the original config', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    const original = { LANGUAGE: 'pt', PROVIDER: 'groq', API_KEY: 'gsk-abc', MODEL: 'llama3' };
    saveConfig(original, p);

    const loaded = loadConfig(p);
    assert.deepEqual(loaded, original);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// validateNodeVersion
// ---------------------------------------------------------------------------

test('validateNodeVersion returns true for the current Node.js version (>=18 required)', () => {
  assert.equal(validateNodeVersion(), true);
});

// ---------------------------------------------------------------------------
// AppConfig.BASE_URL — optional field
// ---------------------------------------------------------------------------

test('saveConfig omits BASE_URL line when field is undefined', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    saveConfig({ LANGUAGE: 'en', PROVIDER: 'openai', API_KEY: 'sk-x', MODEL: 'gpt-4o' }, p);
    const raw = fs.readFileSync(p, 'utf-8');
    assert.ok(!raw.includes('BASE_URL'), 'BASE_URL must not appear in file when undefined');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('saveConfig writes BASE_URL when provided', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    saveConfig(
      {
        LANGUAGE: 'en',
        PROVIDER: 'openai',
        API_KEY: 'sk-x',
        MODEL: 'gpt-4o',
        BASE_URL: 'http://localhost:11434/v1',
      },
      p
    );
    const raw = fs.readFileSync(p, 'utf-8');
    assert.ok(raw.includes('BASE_URL=http://localhost:11434/v1'), 'Expected BASE_URL line in file');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('loadConfig reads BASE_URL when present', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    fs.writeFileSync(
      p,
      'LANGUAGE=en\nPROVIDER=openai\nAPI_KEY=sk-x\nMODEL=gpt-4o\nBASE_URL=http://localhost:11434/v1\n',
      { mode: 0o600 }
    );
    const config = loadConfig(p);
    assert.equal(config.BASE_URL, 'http://localhost:11434/v1');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('saveConfig round-trips with BASE_URL', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-config-test-'));
  const p = path.join(dir, 'config');
  try {
    const original = {
      LANGUAGE: 'en',
      PROVIDER: 'openai',
      API_KEY: 'sk-x',
      MODEL: 'gpt-4o',
      BASE_URL: 'http://localhost:11434/v1',
    };
    saveConfig(original, p);
    const loaded = loadConfig(p);
    assert.deepEqual(loaded, original);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
