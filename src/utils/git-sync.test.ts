import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { execa } from 'execa';

import {
  abortMerge,
  attemptAutoMerge,
  fastForwardPull,
  finalizeMerge,
  getSyncStatus,
  runGitCommand,
  syncWithRemote,
} from './git.js';

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

// ---------------------------------------------------------------------------
// attemptAutoMerge / abortMerge / finalizeMerge
// ---------------------------------------------------------------------------

test('attemptAutoMerge returns status=clean when both sides changed different files', async () => {
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
    const result = await attemptAutoMerge(localDir);

    assert.deepEqual(result, { status: 'clean' });
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('finalizeMerge commits a clean auto-merge with two parents and keeps both files', async () => {
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
    await attemptAutoMerge(localDir);
    await finalizeMerge(localDir);

    const { stdout: parents } = await execa('git', ['log', '-1', '--pretty=%P'], {
      cwd: localDir,
    });
    assert.equal(parents.trim().split(' ').length, 2, 'Expected a merge commit with two parents');
    assert.equal(fs.existsSync(path.join(localDir, 'local-file.txt')), true);
    assert.equal(fs.existsSync(path.join(localDir, 'remote-file.txt')), true);

    const status = await execa('git', ['status', '--porcelain'], { cwd: localDir });
    assert.equal(status.stdout, '');
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('attemptAutoMerge returns status=conflict with the conflicting file when both sides edit the same line', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'README.md'), 'remote change\n');
    await execa('git', ['commit', '-am', 'chore: remote edit'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    fs.writeFileSync(path.join(localDir, 'README.md'), 'local change\n');
    await execa('git', ['commit', '-am', 'chore: local edit'], { cwd: localDir });

    await runGitCommand(['fetch'], localDir);
    const result = await attemptAutoMerge(localDir);

    assert.equal(result.status, 'conflict');
    assert.deepEqual(result.status === 'conflict' ? result.files : [], ['README.md']);
  } finally {
    await execa('git', ['merge', '--abort'], { cwd: localDir, reject: false });
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('abortMerge restores a clean tree and preserves the local commit after a conflicting merge attempt', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'README.md'), 'remote change\n');
    await execa('git', ['commit', '-am', 'chore: remote edit'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    fs.writeFileSync(path.join(localDir, 'README.md'), 'local change\n');
    await execa('git', ['commit', '-am', 'chore: local edit'], { cwd: localDir });

    await runGitCommand(['fetch'], localDir);
    await attemptAutoMerge(localDir);
    await abortMerge(localDir);

    const status = await execa('git', ['status', '--porcelain'], { cwd: localDir });
    assert.equal(status.stdout, '', 'Expected a clean working tree after abort');

    assert.equal(
      fs.existsSync(path.join(localDir, '.git', 'MERGE_HEAD')),
      false,
      'Expected no in-progress merge after abort'
    );

    const content = fs.readFileSync(path.join(localDir, 'README.md'), 'utf-8');
    assert.equal(content, 'local change\n', 'Expected the local edit to be preserved untouched');

    const { stdout: log } = await execa('git', ['log', '--oneline'], { cwd: localDir });
    assert.ok(log.includes('chore: local edit'), 'Expected the local commit to still exist');
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

// ---------------------------------------------------------------------------
// syncWithRemote
// ---------------------------------------------------------------------------

function alwaysConfirm(): Promise<boolean> {
  return Promise.resolve(true);
}

function neverConfirm(): Promise<boolean> {
  return Promise.resolve(false);
}

test('syncWithRemote returns up-to-date when local already matches remote', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    const result = await syncWithRemote(localDir, alwaysConfirm);
    assert.equal(result, 'up-to-date');
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('syncWithRemote returns no-upstream when the branch has no upstream configured', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitai-noupstream-'));
  try {
    await execa('git', ['init', '--initial-branch=main'], { cwd: dir });
    await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: dir });
    await execa('git', ['config', 'user.name', 'Test'], { cwd: dir });
    fs.writeFileSync(path.join(dir, 'file.txt'), 'content');
    await execa('git', ['add', '.'], { cwd: dir });
    await execa('git', ['commit', '-m', 'chore: initial'], { cwd: dir });

    const result = await syncWithRemote(dir, alwaysConfirm);
    assert.equal(result, 'no-upstream');
  } finally {
    cleanupDirs(dir);
  }
});

test('syncWithRemote fast-forwards automatically when only behind, without asking to confirm', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'remote-file.txt'), 'remote change');
    await execa('git', ['add', '.'], { cwd: otherCloneDir });
    await execa('git', ['commit', '-m', 'chore: remote change'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    let wasAsked = false;
    const confirmSpy = () => {
      wasAsked = true;
      return Promise.resolve(true);
    };

    const result = await syncWithRemote(localDir, confirmSpy);

    assert.equal(result, 'fast-forwarded');
    assert.equal(wasAsked, false, 'Fast-forward must not ask for confirmation');
    assert.equal(fs.existsSync(path.join(localDir, 'remote-file.txt')), true);
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('syncWithRemote merges and returns merged when diverged and the user confirms', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'remote-file.txt'), 'remote change');
    await execa('git', ['add', '.'], { cwd: otherCloneDir });
    await execa('git', ['commit', '-m', 'chore: remote change'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    fs.writeFileSync(path.join(localDir, 'local-file.txt'), 'local change');
    await execa('git', ['add', '.'], { cwd: localDir });
    await execa('git', ['commit', '-m', 'chore: local change'], { cwd: localDir });

    const result = await syncWithRemote(localDir, alwaysConfirm);

    assert.equal(result, 'merged');
    assert.equal(fs.existsSync(path.join(localDir, 'local-file.txt')), true);
    assert.equal(fs.existsSync(path.join(localDir, 'remote-file.txt')), true);
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('syncWithRemote returns declined and changes nothing when diverged and the user declines', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'remote-file.txt'), 'remote change');
    await execa('git', ['add', '.'], { cwd: otherCloneDir });
    await execa('git', ['commit', '-m', 'chore: remote change'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    fs.writeFileSync(path.join(localDir, 'local-file.txt'), 'local change');
    await execa('git', ['add', '.'], { cwd: localDir });
    await execa('git', ['commit', '-m', 'chore: local change'], { cwd: localDir });

    const result = await syncWithRemote(localDir, neverConfirm);

    assert.equal(result, 'declined');
    assert.equal(fs.existsSync(path.join(localDir, 'remote-file.txt')), false);

    const status = await execa('git', ['status', '--porcelain'], { cwd: localDir });
    assert.equal(
      status.stdout,
      '',
      'Expected a clean tree — decline must not leave a partial merge'
    );
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('syncWithRemote aborts and returns conflict when diverged with an unresolvable conflict, preserving the local file', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'README.md'), 'remote change\n');
    await execa('git', ['commit', '-am', 'chore: remote edit'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    fs.writeFileSync(path.join(localDir, 'README.md'), 'local change\n');
    await execa('git', ['commit', '-am', 'chore: local edit'], { cwd: localDir });

    const result = await syncWithRemote(localDir, alwaysConfirm);

    assert.equal(result, 'conflict');

    const content = fs.readFileSync(path.join(localDir, 'README.md'), 'utf-8');
    assert.equal(content, 'local change\n', 'Expected the local edit to survive the aborted merge');

    const status = await execa('git', ['status', '--porcelain'], { cwd: localDir });
    assert.equal(status.stdout, '', 'Expected a clean tree after the automatic abort');
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});

test('syncWithRemote exits the process when a fast-forward fails unexpectedly', async () => {
  const { remoteDir, localDir, otherCloneDir } = await makeRemoteWithClones();
  try {
    fs.writeFileSync(path.join(otherCloneDir, 'remote-file.txt'), 'remote change');
    await execa('git', ['add', '.'], { cwd: otherCloneDir });
    await execa('git', ['commit', '-m', 'chore: remote change'], { cwd: otherCloneDir });
    await execa('git', ['push', 'origin', 'main'], { cwd: otherCloneDir });

    // An untracked file with the same name the incoming fast-forward would create
    // makes `git merge --ff-only` fail even though behind>0/ahead=0.
    fs.writeFileSync(path.join(localDir, 'remote-file.txt'), 'untracked local collision');

    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const gitModuleUrl = pathToFileURL(path.join(currentDir, 'git.ts')).href;
    const code = `import { syncWithRemote } from '${gitModuleUrl}'; await syncWithRemote(process.cwd(), async () => true);`;

    const result = await execa('node', ['--import', 'tsx', '--input-type=module', '--eval', code], {
      cwd: localDir,
      reject: false,
    });

    assert.equal(result.exitCode, 1);
  } finally {
    cleanupDirs(remoteDir, localDir, otherCloneDir);
  }
});
