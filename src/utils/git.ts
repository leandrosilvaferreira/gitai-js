import { execa } from 'execa';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { logger } from './logger.js';

export async function runGitCommand(args: string[], cwd: string = process.cwd(), exitOnError: boolean = true): Promise<{ stdout: string; stderr: string; exitCode: number }> {
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
            exitCode: result.exitCode ?? 1
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

export async function isBranchAhead(cwd: string): Promise<boolean> {
    const { stdout } = await runGitCommand(['status', '-uno'], cwd);
    return stdout.includes('Your branch is ahead') || stdout.includes('Seu branch está à frente');
}

export async function performGitPull(cwd: string): Promise<boolean> {
    const { stdout, stderr, exitCode } = await runGitCommand(['pull'], cwd, false);

    if (exitCode !== 0) {
        if (stdout.includes('CONFLICT') || stdout.includes('CONFLITO') || stderr.includes('CONFLICT') || stderr.includes('CONFLITO')) {
            logger.warning("Conflitos detectados durante git pull:");
            logger.error(stdout || stderr);
            return false;
        } else {
             logger.error(`Error executing git pull: ${stdout || stderr}`);
             process.exit(1);
        }
    }
    logger.success("Git pull executed successfully.");
    return true;
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
    // Git automatically handles binary files by showing "Binary files differ"
    const { stdout } = await runGitCommand(['diff', '--cached', '--ignore-all-space', '--diff-filter=d'], cwd);

    return stdout;
}

export async function getDeletedFiles(cwd: string): Promise<string[]> {
    const { stdout } = await runGitCommand(['diff', '--cached', '--diff-filter=D', '--name-only'], cwd);
    return stdout.split('\n').filter(line => line.trim() !== '');
}
