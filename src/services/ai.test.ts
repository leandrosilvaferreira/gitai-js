import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AIService, isReasoningModel } from './ai.js';

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

// ---------------------------------------------------------------------------
// AIService — initializeClient with baseURL and authToken
// ---------------------------------------------------------------------------

test('AIService(openai) constructs without throwing when baseURL is provided', () => {
  assert.doesNotThrow(() => {
    new AIService({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'sk-test',
      language: 'en',
      baseURL: 'http://localhost:11434/v1',
    });
  });
});

test('AIService(groq) constructs without throwing when baseURL is provided', () => {
  assert.doesNotThrow(() => {
    new AIService({
      provider: 'groq',
      model: 'llama3',
      apiKey: 'gsk-test',
      language: 'en',
      baseURL: 'http://localhost:8080/v1',
    });
  });
});

test('AIService(anthropic) constructs without throwing when baseURL is provided', () => {
  assert.doesNotThrow(() => {
    new AIService({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620',
      apiKey: 'test-key',
      language: 'en',
      baseURL: 'https://proxy.example.com',
    });
  });
});

test('AIService(anthropic) constructs without throwing when authToken is provided instead of apiKey', () => {
  assert.doesNotThrow(() => {
    new AIService({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620',
      apiKey: '',
      language: 'en',
      authToken: 'oauth-token-xyz',
    });
  });
});

test('AIService(anthropic) constructs without throwing when both authToken and baseURL are provided', () => {
  assert.doesNotThrow(() => {
    new AIService({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620',
      apiKey: '',
      language: 'en',
      authToken: 'oauth-token-xyz',
      baseURL: 'https://proxy.example.com',
    });
  });
});
