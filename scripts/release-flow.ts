import { Command } from 'commander';
import dotenv from 'dotenv';
import { execa } from 'execa';
import fs from 'fs/promises';
import inquirer from 'inquirer';
import { createRequire } from 'module';
import path from 'path';
import semver from 'semver';
import { AIService } from '../src/services/ai.js';
import { hasUncommittedChanges, runGitCommand } from '../src/utils/git.js';
import { logger } from '../src/utils/logger.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

dotenv.config();

// Helper to run arbitrary commands (like gh) without forcing "git" prefix
async function execCommand(command: string, args: string[], cwd: string = process.cwd(), exitOnError: boolean = true): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
        const result = await execa(command, args, { cwd, reject: false });
        
        if (result.exitCode !== 0) {
            if (exitOnError) {
                logger.error(`Error executing command: ${command} ${args.join(' ')}`);
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
            logger.error(`Unexpected error executing command: ${errorMessage}`);
            process.exit(1);
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { stdout: '', stderr: errorMessage, exitCode: 1 };
    }
}

const program = new Command();

program
  .name('release-flow')
  .description('Automated release workflow')
  .action(async () => {
    logger.header('🚀 Starting Release Workflow');

    // 1. Pre-checks
    const rootDir = process.cwd();
    if (await hasUncommittedChanges(rootDir)) {
        logger.error('Git working directory is not clean. Please commit or stash changes.');
        process.exit(1);
    }
    
    const { stdout: currentBranch } = await runGitCommand(['rev-parse', '--abbrev-ref', 'HEAD'], rootDir);
    if (currentBranch !== 'main' && currentBranch !== 'master') {
        logger.warning(`You are on branch '${currentBranch}'. Releases are typically done from 'main'.`);
        const { proceed } = await inquirer.prompt([{ type: 'confirm', name: 'proceed', message: 'Continue anyway?', default: false }]);
        if (!proceed) process.exit(0);
    }

    // 2. Versioning
    logger.info(`Current version: ${pkg.version}`);

    const patchVer = semver.inc(pkg.version, 'patch');
    const minorVer = semver.inc(pkg.version, 'minor');
    const majorVer = semver.inc(pkg.version, 'major');

    const { releaseType } = await inquirer.prompt([
        {
            type: 'list',
            name: 'releaseType',
            message: 'Select release type:',
            choices: [
                { name: `patch (${patchVer})`, value: 'patch' },
                { name: `minor (${minorVer})`, value: 'minor' },
                { name: `major (${majorVer})`, value: 'major' },
                { name: 'custom', value: 'custom' }
            ]
        }
    ]);

    let newVersion = '';
    if (releaseType === 'custom') {
        const { version } = await inquirer.prompt([{ type: 'input', name: 'version', message: 'Enter custom version:' }]);
        if (!semver.valid(version)) {
            logger.error('Invalid semver version.');
            process.exit(1);
        }
        newVersion = version;
    } else {
        newVersion = semver.inc(pkg.version, releaseType as semver.ReleaseType)!;
    }

    logger.info(`Target version: ${newVersion}`);

    // 3. Generate Notes
    // Get last tag
    let lastTag = '';
    const { stdout: describeStdout, exitCode: describeExitCode } = await runGitCommand(['describe', '--tags', '--abbrev=0'], rootDir, false);
    
    if (describeExitCode === 0) {
        lastTag = describeStdout;
    } else {
        logger.warning('No previous tags found. Assuming initial release.');
        lastTag = ''; 
    }

    let releaseNotes = '';
    if (lastTag) {
        logger.ai(`Generating release notes from ${lastTag} to HEAD...`);
        const aiService = new AIService({
            provider: process.env.PROVIDER!,
            model: process.env.MODEL!,
            apiKey: process.env.API_KEY!,
            language: process.env.LANGUAGE!
        });

        // Get commits
        const { stdout: commitsRaw } = await runGitCommand(['log', `${lastTag}..HEAD`, '--pretty=format:%h %s'], rootDir);
        
        if (!commitsRaw) {
             logger.warning('No commits found since last tag.');
             // Proceed anyway? Yes, maybe just version bump.
        } else {
             releaseNotes = await aiService.generateReleaseNotes(commitsRaw, newVersion, lastTag);
        }
    } else {
        releaseNotes = `Initial release ${newVersion}`;
    }

    // 4. Update Files
    // Update package.json
    pkg.version = newVersion;
    await fs.writeFile(path.join(rootDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
    
    // Update CHANGELOG.md
    const changelogPath = path.join(rootDir, 'CHANGELOG.md');
    let currentChangelog = '';
    try {
        currentChangelog = await fs.readFile(changelogPath, 'utf-8');
    } catch (e) {}
    
    const newChangelog = `${releaseNotes}\n\n---\n\n${currentChangelog}`;
    await fs.writeFile(changelogPath, newChangelog, 'utf-8');
    
    logger.success('Updated package.json and CHANGELOG.md');

    // 5. Commit & Tag
    const tag = `v${newVersion}`;
    await runGitCommand(['add', 'package.json', 'CHANGELOG.md'], rootDir);
    
    // Create commit with multiline message (Title + Body)
    // -m "Title" -m "Body" handles this in git CLI
    await runGitCommand(['commit', '-m', `chore: release ${tag}`, '-m', releaseNotes], rootDir);
    
    await runGitCommand(['tag', tag], rootDir);
    logger.success(`Created git tag ${tag}`);

    // 6. GitHub Release
    logger.info('Checking for GitHub CLI (gh)...');
    try {
        await execCommand('gh', ['--version'], rootDir, false);
        
        const { createRelease } = await inquirer.prompt([{ 
            type: 'confirm', 
            name: 'createRelease', 
            message: `Create GitHub Release for ${tag}?`, 
            default: true 
        }]);

        if (createRelease) {
             logger.ai('Creating GitHub Release...');
             try {
                // gh release create <tag> --title <title> --notes <notes>
                await execCommand('gh', [
                    'release', 'create', tag,
                    '--title', `Release ${tag}`,
                    '--notes', releaseNotes
                ], rootDir);
                logger.success(`✅ GitHub Release ${tag} created successfully!`);
             } catch (error) {
                 logger.error(`Failed to create GitHub Release: ${error}`);
                 logger.warning('You may need to run "gh auth login" or create the release manually.');
             }
        }
    } catch {
        logger.warning('GitHub CLI (gh) not found or not working. Skipping GitHub Release creation.');
        logger.info('Install gh with: brew install gh (or equivalent)');
    }

    // 7. Push
    const { push } = await inquirer.prompt([{ type: 'confirm', name: 'push', message: `Push branch and tag '${tag}' to origin?`, default: true }]);
    
    if (push) {
        logger.git('Pushing to origin...');
        await runGitCommand(['push', 'origin', currentBranch, '--tags'], rootDir);
        logger.success('🚀 Release pushed! CI pipeline should trigger shortly.');
    } else {
        logger.info('Skipped push. Run "git push --tags" manually to trigger release.');
    }

  });

program.parse();
