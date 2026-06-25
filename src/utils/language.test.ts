import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { detectProjectLanguage, getLanguageEmoji } from './language.js';

test('getLanguageEmoji returns the mapped emoji for known languages', () => {
  assert.equal(getLanguageEmoji('TypeScript'), '🔷');
  assert.equal(getLanguageEmoji('Go'), '🐹');
  assert.equal(getLanguageEmoji('Python'), '🐍');
});

test('getLanguageEmoji falls back to ❓ for an unknown or empty language', () => {
  assert.equal(getLanguageEmoji('Brainfuck'), '❓');
  assert.equal(getLanguageEmoji(''), '❓');
});

// Tests for detectProjectLanguage
test('detectProjectLanguage detects Node.js via package.json', async () => {
  let dir = '';
  try {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lang-test-'));
    await fsp.writeFile(path.join(dir, 'package.json'), '');
    const language = await detectProjectLanguage(dir);
    assert.equal(language, 'Node.js');
  } finally {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('detectProjectLanguage detects Go via go.mod', async () => {
  let dir = '';
  try {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lang-test-'));
    await fsp.writeFile(path.join(dir, 'go.mod'), '');
    const language = await detectProjectLanguage(dir);
    assert.equal(language, 'Go');
  } finally {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('detectProjectLanguage detects Python via requirements.txt', async () => {
  let dir = '';
  try {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lang-test-'));
    await fsp.writeFile(path.join(dir, 'requirements.txt'), '');
    const language = await detectProjectLanguage(dir);
    assert.equal(language, 'Python');
  } finally {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('detectProjectLanguage detects Rust via Cargo.toml', async () => {
  let dir = '';
  try {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lang-test-'));
    await fsp.writeFile(path.join(dir, 'Cargo.toml'), '');
    const language = await detectProjectLanguage(dir);
    assert.equal(language, 'Rust');
  } finally {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('detectProjectLanguage detects TypeScript via .ts file extension', async () => {
  let dir = '';
  try {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lang-test-'));
    await fsp.writeFile(path.join(dir, 'index.ts'), '');
    const language = await detectProjectLanguage(dir);
    assert.equal(language, 'TypeScript');
  } finally {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('detectProjectLanguage detects Java via .java file extension', async () => {
  let dir = '';
  try {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lang-test-'));
    await fsp.writeFile(path.join(dir, 'Main.java'), '');
    const language = await detectProjectLanguage(dir);
    assert.equal(language, 'Java');
  } finally {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('detectProjectLanguage prioritizes indicatorFiles over extensionIndicators', async () => {
  let dir = '';
  try {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lang-test-'));
    await fsp.writeFile(path.join(dir, 'package.json'), '');
    await fsp.writeFile(path.join(dir, 'index.ts'), '');
    const language = await detectProjectLanguage(dir);
    assert.equal(language, 'Node.js');
  } finally {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('detectProjectLanguage returns "Unknown" for empty directory', async () => {
  let dir = '';
  try {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lang-test-'));
    const language = await detectProjectLanguage(dir);
    assert.equal(language, 'Unknown');
  } finally {
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('detectProjectLanguage returns "Unknown" for nonexistent directory', async () => {
  const nonexistentDir = path.join(os.tmpdir(), 'this-path-does-not-exist-12345');
  const language = await detectProjectLanguage(nonexistentDir);
  assert.equal(language, 'Unknown');
});
