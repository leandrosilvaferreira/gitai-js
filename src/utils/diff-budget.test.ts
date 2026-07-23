import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildDiffVariants,
  buildFileListSummary,
  buildReducedDiff,
  isLockOrGeneratedFile,
  splitDiffByFile,
  type DiffFileEntry,
} from './diff-budget.js';

const TWO_FILE_DIFF = `diff --git a/src/foo.ts b/src/foo.ts
index 1111111..2222222 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,4 @@
 const a = 1;
+const b = 2;
 const c = 3;
diff --git a/src/bar.ts b/src/bar.ts
new file mode 100644
index 0000000..3333333
--- /dev/null
+++ b/src/bar.ts
@@ -0,0 +1,2 @@
+export const bar = 1;
+export const baz = 2;`;

// ---------------------------------------------------------------------------
// splitDiffByFile
// ---------------------------------------------------------------------------

test('splitDiffByFile splits a two-file diff into one entry per file', () => {
  const entries = splitDiffByFile(TWO_FILE_DIFF);

  assert.equal(entries.length, 2);

  assert.equal(entries[0].path, 'src/foo.ts');
  assert.equal(entries[0].changeType, 'modified');
  assert.equal(entries[0].additions, 1);
  assert.equal(entries[0].deletions, 0);
  assert.ok(entries[0].body.includes('+const b = 2;'));

  assert.equal(entries[1].path, 'src/bar.ts');
  assert.equal(entries[1].changeType, 'added');
  assert.equal(entries[1].additions, 2);
  assert.equal(entries[1].deletions, 0);
});

test('splitDiffByFile returns an empty array for an empty diff', () => {
  assert.deepEqual(splitDiffByFile(''), []);
  assert.deepEqual(splitDiffByFile('   '), []);
});

// ---------------------------------------------------------------------------
// isLockOrGeneratedFile
// ---------------------------------------------------------------------------

test('isLockOrGeneratedFile recognizes lockfiles and generated paths', () => {
  assert.equal(isLockOrGeneratedFile('package-lock.json'), true);
  assert.equal(isLockOrGeneratedFile('yarn.lock'), true);
  assert.equal(isLockOrGeneratedFile('pnpm-lock.yaml'), true);
  assert.equal(isLockOrGeneratedFile('dist/index.js'), true);
  assert.equal(isLockOrGeneratedFile('foo.min.js'), true);
});

test('isLockOrGeneratedFile returns false for regular source files', () => {
  assert.equal(isLockOrGeneratedFile('src/index.ts'), false);
});

// ---------------------------------------------------------------------------
// buildReducedDiff
// ---------------------------------------------------------------------------

test('buildReducedDiff placeholders the lockfile and keeps a small file whole under a tight budget', () => {
  const lockBody = Array.from({ length: 50 }, (_, i) => `+"dep-${i}": "^1.0.${i}",`).join('\n');
  const lockEntry: DiffFileEntry = {
    path: 'package-lock.json',
    header: 'diff --git a/package-lock.json b/package-lock.json',
    body: lockBody,
    additions: 50,
    deletions: 0,
    changeType: 'modified',
  };
  const smallEntry: DiffFileEntry = {
    path: 'src/small.ts',
    header:
      'diff --git a/src/small.ts b/src/small.ts\nindex 1111111..2222222 100644\n--- a/src/small.ts\n+++ b/src/small.ts',
    body: '@@ -1 +1,2 @@\n+export const small = 1;',
    additions: 1,
    deletions: 0,
    changeType: 'modified',
  };
  const originalLength =
    lockEntry.header.length +
    lockEntry.body.length +
    smallEntry.header.length +
    smallEntry.body.length;

  const output = buildReducedDiff([lockEntry, smallEntry], 200);

  assert.ok(!output.includes('dep-0'), 'lockfile body should be omitted');
  assert.ok(output.includes('[gitai] diff omitted'), 'lockfile should get a placeholder note');
  assert.ok(output.includes('export const small = 1;'), 'small file should survive whole');
  assert.ok(output.length < originalLength / 2, 'output should be much smaller than the input');
});

// ---------------------------------------------------------------------------
// buildFileListSummary
// ---------------------------------------------------------------------------

test('buildFileListSummary lists one line per file with no diff content', () => {
  const entries = splitDiffByFile(TWO_FILE_DIFF);

  const summary = buildFileListSummary(entries);

  assert.ok(summary.includes('src/foo.ts (modified, +1 -0)'));
  assert.ok(summary.includes('src/bar.ts (added, +2 -0)'));
  assert.ok(!summary.includes('+const b = 2;'), 'diff body must not leak into the summary');
});

// ---------------------------------------------------------------------------
// buildDiffVariants
// ---------------------------------------------------------------------------

test('buildDiffVariants returns 3 progressively smaller variants for a large diff', () => {
  const lockLines = Array.from({ length: 30 }, (_, i) => `+"dep-${i}": "^1.0.${i}",`);
  const bigDiff = [
    'diff --git a/package-lock.json b/package-lock.json',
    'index 1111111..2222222 100644',
    '--- a/package-lock.json',
    '+++ b/package-lock.json',
    '@@ -1,3 +1,3 @@',
    ...lockLines,
    'diff --git a/src/foo.ts b/src/foo.ts',
    'index 3333333..4444444 100644',
    '--- a/src/foo.ts',
    '+++ b/src/foo.ts',
    '@@ -1,2 +1,3 @@',
    ' const a = 1;',
    '+const b = 2;',
  ].join('\n');

  const variants = buildDiffVariants(bigDiff, 150);

  assert.equal(variants.length, 3);
  assert.equal(variants[0], bigDiff);

  assert.ok(variants[1].length < bigDiff.length, 'reduced diff should be smaller');
  assert.ok(!variants[1].includes('dep-0'), 'reduced diff should drop the lockfile body');

  const hasHunkContentLine = variants[2]
    .split('\n')
    .some((line) => line.startsWith('+') || line.startsWith('-'));
  assert.ok(!hasHunkContentLine, 'file list summary must not contain raw hunk lines');
});

test('buildDiffVariants collapses to a single variant when the diff is empty', () => {
  assert.deepEqual(buildDiffVariants(''), ['']);
});

// ---------------------------------------------------------------------------
// buildReducedDiff — partial truncation branch (untested before this case)
// ---------------------------------------------------------------------------

test('buildReducedDiff partially truncates a single oversized non-lock file', () => {
  const header =
    'diff --git a/src/big.ts b/src/big.ts\nindex 1111111..2222222 100644\n--- a/src/big.ts\n+++ b/src/big.ts';
  const LINE = '+xxxxxxxxxx'; // 11 chars, so each line costs 12 with the joining newline
  const entry: DiffFileEntry = {
    path: 'src/big.ts',
    header,
    body: Array.from({ length: 20 }, () => LINE).join('\n'),
    additions: 20,
    deletions: 0,
    changeType: 'modified',
  };

  // Budget covers the header plus exactly 5 lines (5 * 12 = 60; a 6th would need 72).
  const output = buildReducedDiff([entry], header.length + 60);
  const keptLineCount = output.split('\n').filter((line) => line === LINE).length;

  assert.equal(keptLineCount, 5, 'should keep exactly as many lines as the budget allows');
  assert.match(output, /\.\.\. truncated, 15 more lines/);
});

test('splitDiffByFile counts deletions, not just additions', () => {
  const diffWithDeletion = `diff --git a/src/foo.ts b/src/foo.ts
index 1111111..2222222 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,3 +1,2 @@
 const a = 1;
-const b = 2;
 const c = 3;`;

  const [entry] = splitDiffByFile(diffWithDeletion);

  assert.equal(entry.additions, 0);
  assert.equal(entry.deletions, 1);
});
