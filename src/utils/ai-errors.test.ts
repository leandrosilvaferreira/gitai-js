import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isContextLengthError } from './ai-errors.js';

test('isContextLengthError detects the openai context_length_exceeded shape', () => {
  const error = Object.assign(
    new Error(
      '400 Your input exceeds the context window of this model. Reduce the length of the messages.'
    ),
    { status: 400, code: 'context_length_exceeded', type: 'invalid_request_error' }
  );

  assert.equal(isContextLengthError(error), true);
});

test('isContextLengthError detects the groq shape (code nested under .error, no top-level code)', () => {
  const error = Object.assign(new Error('400 Bad Request'), {
    status: 400,
    error: { code: 'context_length_exceeded', message: 'context length exceeded' },
  });

  assert.equal(isContextLengthError(error), true);
});

test('isContextLengthError detects the anthropic shape via message only (no code field at all)', () => {
  const error = Object.assign(new Error('400 prompt is too long: 250000 tokens > 200000 maximum'), {
    status: 400,
    type: 'invalid_request_error',
  });

  assert.equal(isContextLengthError(error), true);
});

test('isContextLengthError returns false for an auth error', () => {
  const error = Object.assign(new Error('401 Incorrect API key provided'), { status: 401 });

  assert.equal(isContextLengthError(error), false);
});

test('isContextLengthError returns false for a rate-limit error', () => {
  const error = Object.assign(new Error('429 Rate limit reached'), { status: 429 });

  assert.equal(isContextLengthError(error), false);
});

test('isContextLengthError returns false for a generic network error without a status', () => {
  assert.equal(isContextLengthError(new Error('fetch failed')), false);
});
