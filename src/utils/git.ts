import { execa } from 'execa';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { logger } from './logger.js';

export async function runGitCommand(
  args: string[],
  cwd: string = process.cwd(),
  exitOnError: boolean = true
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execa('git', args, { cwd, reject: false });

    if (result.exitCode !== 0) {
      if (exitOnError) {
        logger.error(`Error executing command: git ${args.join(' ')}`);
        logger.error(`Standard output: ${result.stdout}`);
        logger.error(`Error output: ${result.stderr}`);
        process.exit(1);
      }
    }
    return {
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      exitCode: result.exitCode ?? 1,
    };
  } catch (error: unknown) {
    if (exitOnError) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Unexpected error executing git command: ${errorMessage}`);
      process.exit(1);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { stdout: '', stderr: errorMessage, exitCode: 1 };
  }
}

export async function hasUncommittedChanges(cwd: string): Promise<boolean> {
  const { stdout } = await runGitCommand(['status', '--porcelain'], cwd);
  return stdout.length > 0;
}

export async function commitChanges(commitMessage: string, cwd: string): Promise<void> {
  await runGitCommand(['add', '.'], cwd);

  // Write commit message to temp file to handle special characters correctly
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `gitai_commit_${Date.now()}.txt`);

  try {
    await fs.writeFile(tempFilePath, commitMessage, 'utf-8');
    await runGitCommand(['commit', '-F', tempFilePath], cwd);
  } finally {
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // Ignore error if cleanup fails
    }
  }
}

export async function getDiffWithNewFiles(cwd: string): Promise<string> {
  // Add all changes (including new files) to staging area
  await runGitCommand(['add', '.'], cwd);

  // Get diff of staged changes (includes new files with full content)
  // --cached: show staged changes
  // --ignore-all-space: ignore whitespace-only changes
  // --diff-filter=d: exclude deleted files from the diff content
  // --src-prefix/--dst-prefix: force the standard a/ b/ header regardless of the
  // user's diff.noprefix/diff.mnemonicPrefix git config (diff-budget.ts parses on it)
  // Git automatically handles binary files by showing "Binary files differ"
  const { stdout } = await runGitCommand(
    [
      'diff',
      '--cached',
      '--ignore-all-space',
      '--diff-filter=d',
      '--src-prefix=a/',
      '--dst-prefix=b/',
    ],
    cwd
  );

  return stdout;
}

export async function getDeletedFiles(cwd: string): Promise<string[]> {
  const { stdout } = await runGitCommand(
    ['diff', '--cached', '--diff-filter=D', '--name-only'],
    cwd
  );
  return stdout.split('\n').filter((line) => line.trim() !== '');
}

export interface SyncStatus {
  hasUpstream: boolean;
  ahead: number;
  behind: number;
}

export async function getSyncStatus(cwd: string): Promise<SyncStatus> {
  const upstream = await runGitCommand(
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'],
    cwd,
    false
  );

  if (upstream.exitCode !== 0) {
    return { hasUpstream: false, ahead: 0, behind: 0 };
  }

  const { stdout } = await runGitCommand(
    ['rev-list', '--left-right', '--count', '@{u}...HEAD'],
    cwd,
    false
  );
  const [behind, ahead] = stdout.split(/\s+/).map(Number);

  return { hasUpstream: true, ahead, behind };
}

export async function fastForwardPull(cwd: string): Promise<boolean> {
  const { exitCode } = await runGitCommand(['merge', '--ff-only', '@{u}'], cwd, false);
  return exitCode === 0;
}

export type MergeAttemptResult = { status: 'clean' } | { status: 'conflict'; files: string[] };

export async function attemptAutoMerge(cwd: string): Promise<MergeAttemptResult> {
  await runGitCommand(['merge', '--no-commit', '@{u}'], cwd, false);

  const { stdout } = await runGitCommand(['diff', '--name-only', '--diff-filter=U'], cwd, false);
  const files = stdout.split('\n').filter((line) => line.trim() !== '');

  if (files.length > 0) {
    return { status: 'conflict', files };
  }
  return { status: 'clean' };
}

export async function abortMerge(cwd: string): Promise<void> {
  await runGitCommand(['merge', '--abort'], cwd);
}

export async function finalizeMerge(cwd: string): Promise<void> {
  await runGitCommand(['commit', '--no-edit'], cwd);
}

export type SyncResult =
  | 'up-to-date'
  | 'fast-forwarded'
  | 'merged'
  | 'declined'
  | 'conflict'
  | 'no-upstream';

export async function syncWithRemote(
  cwd: string,
  confirmMerge: () => Promise<boolean>
): Promise<SyncResult> {
  await runGitCommand(['fetch'], cwd);

  const status = await getSyncStatus(cwd);

  if (!status.hasUpstream) {
    logger.info('No upstream branch configured — skipping remote sync check.');
    return 'no-upstream';
  }

  if (status.behind === 0) {
    return 'up-to-date';
  }

  if (status.ahead === 0) {
    logger.info(`Remote branch has ${status.behind} new commit(s). Fast-forwarding...`);
    const fastForwarded = await fastForwardPull(cwd);
    if (!fastForwarded) {
      logger.error(
        'Fast-forward failed unexpectedly. Check for untracked files that would be overwritten, then retry.'
      );
      process.exit(1);
    }
    logger.success('Fast-forwarded to the latest remote commit(s).');
    return 'fast-forwarded';
  }

  logger.warning(
    `Local and remote branches diverged: ${status.ahead} local commit(s), ${status.behind} remote commit(s).`
  );

  const shouldMerge = await confirmMerge();

  if (!shouldMerge) {
    logger.info('Automatic merge declined. Nothing was changed.');
    return 'declined';
  }

  const attempt = await attemptAutoMerge(cwd);

  if (attempt.status === 'conflict') {
    await abortMerge(cwd);
    logger.error(`Merge conflict in: ${attempt.files.join(', ')}. Merge aborted, nothing changed.`);
    return 'conflict';
  }

  await finalizeMerge(cwd);
  logger.success('Automatic merge completed.');
  return 'merged';
}
