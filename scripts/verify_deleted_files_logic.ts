import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { getDeletedFiles, getDiffWithNewFiles, runGitCommand } from '../src/utils/git.js';

async function verify() {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gitai-test-'));
    console.log(`Created temp dir: ${tempDir}`);

    try {
        await runGitCommand(['init'], tempDir);
        await runGitCommand(['config', 'user.email', 'test@test.com'], tempDir);
        await runGitCommand(['config', 'user.name', 'Test User'], tempDir);

        await fs.writeFile(path.join(tempDir, 'delete_me.txt'), 'content to be deleted');
        await fs.writeFile(path.join(tempDir, 'keep_me.txt'), 'content to keep');
        
        await runGitCommand(['add', '.'], tempDir);
        await runGitCommand(['commit', '-m', 'initial'], tempDir);

        // Delete file
        await fs.unlink(path.join(tempDir, 'delete_me.txt'));
        await runGitCommand(['add', '.'], tempDir);

        console.log('\n--- Testing getDeletedFiles ---');
        const deleted = await getDeletedFiles(tempDir);
        console.log('Deleted Files Result:', deleted);

        if (deleted.length === 1 && deleted[0] === 'delete_me.txt') {
            console.log('✅ getDeletedFiles passed');
        } else {
            console.error('❌ getDeletedFiles failed');
            console.error('Expected ["delete_me.txt"], got:', deleted);
            process.exit(1);
        }

        console.log('\n--- Testing getDiffWithNewFiles ---');
        const diff = await getDiffWithNewFiles(tempDir);
        console.log('Diff Result (should be empty or minimal):', diff);

        if (diff.trim() === '') {
             console.log('✅ getDiffWithNewFiles passed (diff is empty as expected)');
        } else {
             console.error('❌ getDiffWithNewFiles failed - diff should be empty for deleted files only');
             process.exit(1);
        }

    } catch (e) {
        console.error('Verification failed:', e);
        process.exit(1);
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log('\nTemp dir cleaned up.');
    }
}

verify().catch(console.error);
