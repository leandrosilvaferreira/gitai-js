import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isReasoningModel } from './ai.js';

test('isReasoningModel returns true for o1 models', () => {
  assert.equal(isReasoningModel('o1'), true);
  assert.equal(isReasoningModel('o1-mini'), true);
  assert.equal(isReasoningModel('o1-preview'), true);
});

test('isReasoningModel returns true for o3 models', () => {
  assert.equal(isReasoningModel('o3'), true);
  assert.equal(isReasoningModel('o3-mini'), true);
});

test('isReasoningModel returns true for gpt-5 models', () => {
  assert.equal(isReasoningModel('gpt-5'), true);
  assert.equal(isReasoningModel('gpt-5.2'), true);
  assert.equal(isReasoningModel('gpt-5-turbo'), true);
});

test('isReasoningModel returns false for legacy models', () => {
  assert.equal(isReasoningModel('gpt-4o'), false);
  assert.equal(isReasoningModel('gpt-4'), false);
  assert.equal(isReasoningModel('gpt-3.5-turbo'), false);
  assert.equal(isReasoningModel(''), false);
});
