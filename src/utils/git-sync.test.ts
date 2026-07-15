import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { execa } from 'execa';

import { fastForwardPull, getSyncStatus, runGitCommand } from './git.js';

// ---------------------------------------------------------------------------
// Helpers — bare "remote" repo + two clones, to exercise real fetch/ahead/behind
// ---------------------------------------------------------------------------

async function makeRemoteWithClones(): Promise<{
  remoteDir: string;
  localDir: string;
  otherCloneDir: string;
}> {
  const remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-remote-'));
  await execa('git', ['init', '--bare', '--initial-branch=main', remoteDir]);

  const otherCloneDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-other-'));
  await execa('git', ['clone', remoteDir, otherCloneDir]);
  await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: otherCloneDir });
  await execa('git', ['config', 'user.name', 'Test'], { cwd: otherCloneDir });
  fs.writeFileSync(path.join(otherCloneDir, 'README.md'), 'seed\n');
  await execa('git', ['add', '.'], { cwd: otherCloneDir });
  await execa('git', ['commit', '-m', 'chore: seed'], { cwd: otherCloneDir });
  await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

  const localDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-local-'));
  await execa('git', ['clone', remoteDir, localDir]);
  await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: localDir });
  await execa('git', ['config', 'user.name', 'Test'], { cwd: localDir });

  return { remoteDir, localDir, otherCloneDir };
}

function cleanupDirs(...dirs: string[]): void {
  for (const dir of dirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// getSyncStatus
// ---------------------------------------------------------------------------

test('getSyncStatus returns hasUpstream=false when the branch has no upstream configured', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-noupstream-'));
  try {
    await execa('git', ['init', '--initial-branch=main'], { cwd: dir });
    await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: dir });
    await execa('git', ['config', 'user.name', 'Test'], { cwd: dir });
    fs.writeFileSync(path.join(dir, 'file.txt'), 'content');
    await execa('git', ['add', '.'], { cwd: dir });
    await execa('git', ['commit', '-m', 'chore: initial'], { cwd: dir });

    const result = await getSyncStatus(dir);
    assert.deepEqual(result, { hasUpstream: false, ahead: 0, behind: 0 });
  } finally {
    cleanupDirs(dir);
  }
});

test('getSyncStatus returns ahead=0 behind=0 right after a clean clone', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    const result = await getSyncStatus(localDir);
    assert.deepEqual(result, { hasUpstream: true, ahead: 0, behind: 0 });
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('getSyncStatus reports behind>0 when the remote has new commits not yet fetched-in', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'remote-file.txt'), 'remote change');
    await execa('git', ['add', '.'], { cwd: otherCloneDir });
    await execa('git', ['commit', '-m', 'chore: remote change'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    await runGitCommand(['fetch'], localDir);
    const result = await getSyncStatus(localDir);
    assert.deepEqual(result, { hasUpstream: true, ahead: 0, behind: 1 });
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('getSyncStatus reports ahead>0 when local has new commits not pushed yet', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(localDir, 'local-file.txt'), 'local change');
    await execa('git', ['add', '.'], { cwd: localDir });
    await execa('git', ['commit', '-m', 'chore: local change'], { cwd: localDir });

    const result = await getSyncStatus(localDir);
    assert.deepEqual(result, { hasUpstream: true, ahead: 1, behind: 0 });
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('getSyncStatus reports both ahead>0 and behind>0 when local and remote diverged', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'remote-file.txt'), 'remote change');
    await execa('git', ['add', '.'], { cwd: otherCloneDir });
    await execa('git', ['commit', '-m', 'chore: remote change'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    fs.writeFileSync(path.join(localDir, 'local-file.txt'), 'local change');
    await execa('git', ['add', '.'], { cwd: localDir });
    await execa('git', ['commit', '-m', 'chore: local change'], { cwd: localDir });

    await runGitCommand(['fetch'], localDir);
    const result = await getSyncStatus(localDir);
    assert.deepEqual(result, { hasUpstream: true, ahead: 1, behind: 1 });
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

// ---------------------------------------------------------------------------
// fastForwardPull
// ---------------------------------------------------------------------------

test('fastForwardPull returns true and applies the remote commit when only behind', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'remote-file.txt'), 'remote change');
    await execa('git', ['add', '.'], { cwd: otherCloneDir });
    await execa('git', ['commit', '-m', 'chore: remote change'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    await runGitCommand(['fetch'], localDir);
    const result = await fastForwardPull(localDir);

    assert.equal(result, true);
    assert.equal(fs.existsSync(path.join(localDir, 'remote-file.txt')), true);
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('fastForwardPull returns false when local and remote have diverged', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'remote-file.txt'), 'remote change');
    await execa('git', ['add', '.'], { cwd: otherCloneDir });
    await execa('git', ['commit', '-m', 'chore: remote change'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    fs.writeFileSync(path.join(localDir, 'local-file.txt'), 'local change');
    await execa('git', ['add', '.'], { cwd: localDir });
    await execa('git', ['commit', '-m', 'chore: local change'], { cwd: localDir });

    await runGitCommand(['fetch'], localDir);
    const result = await fastForwardPull(localDir);

    assert.equal(result, false);
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});
