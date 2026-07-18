import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveTargetVersion, suggestBumpType } from './release-version.js';

test('suggestBumpType returns major for a breaking marker subject', () => {
  assert.equal(suggestBumpType(['feat!: drop node 18 support']), 'major');
});

test('suggestBumpType returns major for a scoped breaking marker subject', () => {
  assert.equal(suggestBumpType(['fix(config)!: rename API_KEY field']), 'major');
});

test('suggestBumpType returns major for a BREAKING CHANGE footer in the commit body', () => {
  // The spec-compliant form: no `!` in the subject, footer on its own line in the body.
  const message = 'fix: rename config key\n\nBREAKING CHANGE: config.apiKey is now config.token';
  assert.equal(suggestBumpType(['chore: cleanup', message]), 'major');
});

test('suggestBumpType returns major for the hyphenated BREAKING-CHANGE footer', () => {
  const message = 'fix: rename config key\n\nBREAKING-CHANGE: config.apiKey renamed';
  assert.equal(suggestBumpType([message]), 'major');
});

test('suggestBumpType does not treat a mid-sentence mention of breaking changes as major', () => {
  const message = 'docs: explain how we avoid BREAKING CHANGE footers in this repo';
  assert.equal(suggestBumpType([message]), 'patch');
});

test('suggestBumpType returns minor when any feat is present', () => {
  assert.equal(suggestBumpType(['fix: a bug', 'feat: add self-update', 'docs: readme']), 'minor');
});

test('suggestBumpType returns minor for a scoped feat', () => {
  assert.equal(suggestBumpType(['feat(cli): add --status flag']), 'minor');
});

test('suggestBumpType returns patch when only fix/docs/chore are present', () => {
  assert.equal(suggestBumpType(['fix: a bug', 'docs: readme', 'chore: bump deps']), 'patch');
});

test('suggestBumpType returns patch for an empty commit list', () => {
  assert.equal(suggestBumpType([]), 'patch');
});

test('suggestBumpType ignores a subject that merely starts with the word feature', () => {
  assert.equal(suggestBumpType(['feature toggle cleanup']), 'patch');
});

test('resolveTargetVersion bumps patch/minor/major from the current version', () => {
  assert.equal(resolveTargetVersion('1.2.0', { type: 'patch' }), '1.2.1');
  assert.equal(resolveTargetVersion('1.2.0', { type: 'minor' }), '1.3.0');
  assert.equal(resolveTargetVersion('1.2.0', { type: 'major' }), '2.0.0');
});

test('resolveTargetVersion with type auto infers the bump from commit messages', () => {
  const messages = ['feat: add self-update', 'fix: widen try/catch'];
  assert.equal(resolveTargetVersion('1.2.0', { type: 'auto', messages }), '1.3.0');
});

test('resolveTargetVersion with type auto falls back to patch without feat commits', () => {
  assert.equal(resolveTargetVersion('1.2.0', { type: 'auto', messages: ['fix: a bug'] }), '1.2.1');
});

test('resolveTargetVersion with type auto returns a major bump for a breaking footer', () => {
  const messages = ['feat: new flag\n\nBREAKING CHANGE: --old removed'];
  assert.equal(resolveTargetVersion('1.2.0', { type: 'auto', messages }), '2.0.0');
});

test('resolveTargetVersion returns an explicit version when it is greater than current', () => {
  assert.equal(resolveTargetVersion('1.2.0', { version: '2.5.0' }), '2.5.0');
});

test('resolveTargetVersion strips a v prefix so the tag does not become vv1.5.0', () => {
  // semver.valid('v1.5.0') accepts it; returning the raw input would write "v1.5.0"
  // into package.json and build the tag as `v${version}` = "vv1.5.0".
  assert.equal(resolveTargetVersion('1.3.0', { version: 'v1.5.0' }), '1.5.0');
});

test('resolveTargetVersion rejects an uppercase V prefix rather than guessing', () => {
  // semver.valid('V2.0.0') is null. Failing loudly beats coercing, which would also
  // happily accept typos like 'foo1.2.3bar'.
  assert.throws(() => resolveTargetVersion('1.3.0', { version: 'V2.0.0' }), /Invalid semver/);
});

test('resolveTargetVersion compares a v-prefixed version against current correctly', () => {
  assert.throws(() => resolveTargetVersion('1.3.0', { version: 'v1.2.0' }), /must be greater/);
});

test('resolveTargetVersion throws when the explicit version is not valid semver', () => {
  assert.throws(() => resolveTargetVersion('1.2.0', { version: 'banana' }), /Invalid semver/);
});

test('resolveTargetVersion throws when the explicit version is not greater than current', () => {
  assert.throws(() => resolveTargetVersion('1.2.0', { version: '1.2.0' }), /must be greater/);
});

test('resolveTargetVersion throws when both type and version are given', () => {
  assert.throws(
    () => resolveTargetVersion('1.2.0', { type: 'patch', version: '2.0.0' }),
    /not both/
  );
});

test('resolveTargetVersion throws when neither type nor version is given', () => {
  assert.throws(() => resolveTargetVersion('1.2.0', {}), /No release type given/);
});

test('resolveTargetVersion throws for an unknown release type', () => {
  assert.throws(() => resolveTargetVersion('1.2.0', { type: 'hotfix' }), /Invalid release type/);
});
