import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diagnoseRelease, parseCiConclusion, type ReleaseState } from './release-status.js';

const baseState: ReleaseState = {
  packageName: '@notyped/gitai',
  pkgVersion: '1.3.0',
  npmVersion: '1.3.0',
  lastTag: 'v1.3.0',
  tagPushed: true,
  unreleasedCount: 0,
  ciConclusion: 'success',
};

const stateWith = (overrides: Partial<ReleaseState>): ReleaseState => ({
  ...baseState,
  ...overrides,
});

test('diagnoseRelease returns in-sync when npm matches package.json and nothing is pending', () => {
  const diagnosis = diagnoseRelease(baseState);
  assert.equal(diagnosis.verdict, 'in-sync');
  assert.equal(diagnosis.nextStep, null);
});

test('diagnoseRelease reports unreleased-commits when commits sit on top of the last tag', () => {
  const diagnosis = diagnoseRelease(stateWith({ unreleasedCount: 11 }));
  assert.equal(diagnosis.verdict, 'unreleased-commits');
  assert.match(diagnosis.message, /11 commit/);
  assert.match(diagnosis.nextStep ?? '', /npm run release/);
});

test('diagnoseRelease explains that commit and push alone do not publish', () => {
  const diagnosis = diagnoseRelease(stateWith({ unreleasedCount: 3 }));
  assert.match(diagnosis.message, /only pushing a v\* tag does/);
});

test('diagnoseRelease reports tag-not-pushed when the tag exists only locally', () => {
  const diagnosis = diagnoseRelease(
    stateWith({ tagPushed: false, npmVersion: '1.2.0', ciConclusion: null })
  );
  assert.equal(diagnosis.verdict, 'tag-not-pushed');
  assert.match(diagnosis.nextStep ?? '', /git push origin v1\.3\.0/);
});

test('diagnoseRelease reports ci-pending while publish.yml has not finished', () => {
  const diagnosis = diagnoseRelease(stateWith({ npmVersion: '1.2.0', ciConclusion: null }));
  assert.equal(diagnosis.verdict, 'ci-pending');
});

test('diagnoseRelease reports publish-failed when CI finished but npm never got the version', () => {
  const diagnosis = diagnoseRelease(
    stateWith({ pkgVersion: '1.0.8', lastTag: 'v1.0.8', npmVersion: '1.0.7' })
  );
  assert.equal(diagnosis.verdict, 'publish-failed');
  assert.match(diagnosis.message, /did NOT land/);
});

test('diagnoseRelease treats a green CI run with a stale npm version as a failure, not success', () => {
  const diagnosis = diagnoseRelease(
    stateWith({ pkgVersion: '1.0.8', lastTag: 'v1.0.8', npmVersion: '1.0.7' })
  );
  assert.notEqual(diagnosis.verdict, 'in-sync');
  assert.match(diagnosis.nextStep ?? '', /new patch/);
});

test('diagnoseRelease reports publish-failed when the package was never published at all', () => {
  const diagnosis = diagnoseRelease(stateWith({ npmVersion: null, ciConclusion: 'failure' }));
  assert.equal(diagnosis.verdict, 'publish-failed');
});

test('diagnoseRelease prioritises an unpublished cut version over pending commits', () => {
  const diagnosis = diagnoseRelease(
    stateWith({ npmVersion: '1.2.0', ciConclusion: 'failure', unreleasedCount: 4 })
  );
  assert.equal(diagnosis.verdict, 'publish-failed');
});

test('diagnoseRelease reports version-not-tagged when the bump was committed but never tagged', () => {
  const diagnosis = diagnoseRelease(
    stateWith({ pkgVersion: '1.4.0', lastTag: 'v1.3.0', npmVersion: '1.3.0', unreleasedCount: 1 })
  );
  assert.equal(diagnosis.verdict, 'version-not-tagged');
  assert.match(diagnosis.nextStep ?? '', /git tag -a v1\.4\.0/);
});

test('diagnoseRelease does not confuse ordinary unreleased commits with a missing tag', () => {
  // package.json still matches the last tag — the normal "commits piled up" state.
  const diagnosis = diagnoseRelease(
    stateWith({ pkgVersion: '1.3.0', lastTag: 'v1.3.0', npmVersion: '1.3.0', unreleasedCount: 5 })
  );
  assert.equal(diagnosis.verdict, 'unreleased-commits');
});

const ghRuns = (runs: unknown): string => JSON.stringify(runs);

test('parseCiConclusion returns the conclusion of the run matching the sha', () => {
  const stdout = ghRuns([
    { headSha: 'aaa', status: 'completed', conclusion: 'failure' },
    { headSha: 'bbb', status: 'completed', conclusion: 'success' },
  ]);
  assert.equal(parseCiConclusion(stdout, 'bbb'), 'success');
});

test('parseCiConclusion returns null while the matching run is still in progress', () => {
  const stdout = ghRuns([{ headSha: 'aaa', status: 'in_progress', conclusion: null }]);
  assert.equal(parseCiConclusion(stdout, 'aaa'), null);
});

test('parseCiConclusion returns null when no run matches the sha', () => {
  const stdout = ghRuns([{ headSha: 'aaa', status: 'completed', conclusion: 'success' }]);
  assert.equal(parseCiConclusion(stdout, 'zzz'), null);
});

test('parseCiConclusion returns null for malformed JSON instead of throwing', () => {
  assert.equal(parseCiConclusion('not json at all', 'aaa'), null);
});

test('parseCiConclusion returns null when gh returns an object instead of an array', () => {
  assert.equal(parseCiConclusion(ghRuns({ message: 'gh not authenticated' }), 'aaa'), null);
});

test('parseCiConclusion returns null for empty output', () => {
  assert.equal(parseCiConclusion('', 'aaa'), null);
});

test('parseCiConclusion tolerates null entries in the run list', () => {
  const stdout = ghRuns([null, { headSha: 'aaa', status: 'completed', conclusion: 'success' }]);
  assert.equal(parseCiConclusion(stdout, 'aaa'), 'success');
});
