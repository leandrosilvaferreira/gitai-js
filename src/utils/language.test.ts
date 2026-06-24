import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getLanguageEmoji } from './language.js';

test('getLanguageEmoji returns the mapped emoji for known languages', () => {
  assert.equal(getLanguageEmoji('TypeScript'), '🔷');
  assert.equal(getLanguageEmoji('Go'), '🐹');
  assert.equal(getLanguageEmoji('Python'), '🐍');
});

test('getLanguageEmoji falls back to ❓ for an unknown or empty language', () => {
  assert.equal(getLanguageEmoji('Brainfuck'), '❓');
  assert.equal(getLanguageEmoji(''), '❓');
});
