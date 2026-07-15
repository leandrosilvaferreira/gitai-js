import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { execa } from 'execa';

import {
  commitChanges,
  getDeletedFiles,
  getDiffWithNewFiles,
  hasUncommittedChanges,
  runGitCommand,
} from './git.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeTmpRepo(): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-test-'));
  await execa('git', ['init'], { cwd: dir });
  await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: dir });
  await execa('git', ['config', 'user.name', 'Test'], { cwd: dir });
  return dir;
}

function cleanupTmpRepo(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// runGitCommand
// ---------------------------------------------------------------------------

test('runGitCommand with exitOnError=false does not call process.exit on invalid git command', async () => {
  const dir = await makeTmpRepo();
  try {
    const result = await runGitCommand(['invalid-command'], dir, false);
    assert.notEqual(result.exitCode, 0, 'Expected non-zero exit code for invalid git command');
  } finally {
    cleanupTmpRepo(dir);
  }
});

test('runGitCommand returns exitCode 0 and defined stdout for git status in valid repo', async () => {
  const dir = await makeTmpRepo();
  try {
    const result = await runGitCommand(['status'], dir, false);
    assert.equal(result.exitCode, 0, 'Expected exitCode 0 for git status');
    assert.ok(result.stdout !== undefined, 'Expected stdout to be defined');
  } finally {
    cleanupTmpRepo(dir);
  }
});

test('runGitCommand with default exitOnError=true calls process.exit(1) on an invalid git command', async () => {
  const dir = await makeTmpRepo();
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const gitModuleUrl = pathToFileURL(path.join(currentDir, 'git.ts')).href;
    const code = `import { runGitCommand } from '${gitModuleUrl}'; await runGitCommand(['this-is-not-a-real-git-command'], process.cwd());`;

    const result = await execa('node', ['--import', 'tsx', '--input-type=module', '--eval', code], {
      cwd: dir,
      reject: false,
    });

    assert.equal(result.exitCode, 1);
  } finally {
    cleanupTmpRepo(dir);
  }
});

// ---------------------------------------------------------------------------
// hasUncommittedChanges
// ---------------------------------------------------------------------------

test('hasUncommittedChanges returns false for a newly created repo with no files', async () => {
  const dir = await makeTmpRepo();
  try {
    const result = await hasUncommittedChanges(dir);
    assert.equal(result, false);
  } finally {
    cleanupTmpRepo(dir);
  }
});

test('hasUncommittedChanges returns true when an unstaged file is present', async () => {
  const dir = await makeTmpRepo();
  try {
    fs.writeFileSync(path.join(dir, 'new-file.txt'), 'hello');
    const result = await hasUncommittedChanges(dir);
    assert.equal(result, true);
  } finally {
    cleanupTmpRepo(dir);
  }
});

test('hasUncommittedChanges returns false after a clean commit', async () => {
  const dir = await makeTmpRepo();
  try {
    fs.writeFileSync(path.join(dir, 'committed.txt'), 'content');
    await execa('git', ['add', '.'], { cwd: dir });
    await execa('git', ['commit', '-m', 'chore: initial commit'], { cwd: dir });
    const result = await hasUncommittedChanges(dir);
    assert.equal(result, false);
  } finally {
    cleanupTmpRepo(dir);
  }
});

// ---------------------------------------------------------------------------
// getDeletedFiles
// ---------------------------------------------------------------------------

test('getDeletedFiles returns empty array when no staged deletions exist', async () => {
  const dir = await makeTmpRepo();
  try {
    const result = await getDeletedFiles(dir);
    assert.deepEqual(result, []);
  } finally {
    cleanupTmpRepo(dir);
  }
});

test('getDeletedFiles returns the filename after a file is committed then deleted and staged', async () => {
  const dir = await makeTmpRepo();
  try {
    const filename = 'to-delete.txt';
    fs.writeFileSync(path.join(dir, filename), 'to be deleted');
    await execa('git', ['add', '.'], { cwd: dir });
    await execa('git', ['commit', '-m', 'chore: add file'], { cwd: dir });

    fs.unlinkSync(path.join(dir, filename));
    await execa('git', ['add', '.'], { cwd: dir });

    const result = await getDeletedFiles(dir);
    assert.ok(
      result.includes(filename),
      `Expected deleted file list to include "${filename}", got: ${JSON.stringify(result)}`
    );
  } finally {
    cleanupTmpRepo(dir);
  }
});

// ---------------------------------------------------------------------------
// getDiffWithNewFiles
// ---------------------------------------------------------------------------

test('getDiffWithNewFiles returns empty string for a repo with no files', async () => {
  const dir = await makeTmpRepo();
  try {
    const result = await getDiffWithNewFiles(dir);
    assert.equal(result, '');
  } finally {
    cleanupTmpRepo(dir);
  }
});

test('getDiffWithNewFiles returns a non-empty diff containing the new filename before first commit', async () => {
  const dir = await makeTmpRepo();
  try {
    const filename = 'new-feature.ts';
    fs.writeFileSync(path.join(dir, filename), 'export const x = 1;\n');
    const result = await getDiffWithNewFiles(dir);
    assert.ok(result.length > 0, 'Expected non-empty diff');
    assert.ok(result.includes(filename), `Expected diff to contain "${filename}", got: ${result}`);
  } finally {
    cleanupTmpRepo(dir);
  }
});

// ---------------------------------------------------------------------------
// commitChanges
// ---------------------------------------------------------------------------

test('commitChanges creates a commit with the provided message', async () => {
  const dir = await makeTmpRepo();
  try {
    fs.writeFileSync(path.join(dir, 'feature.ts'), 'export const feature = true;\n');
    await commitChanges('feat: test commit message', dir);

    const { stdout } = await execa('git', ['log', '--oneline'], { cwd: dir });
    assert.ok(
      stdout.includes('feat: test commit message'),
      `Expected git log to include commit message, got: ${stdout}`
    );
  } finally {
    cleanupTmpRepo(dir);
  }
});
