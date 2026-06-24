import { Command } from 'commander';
import dotenv from 'dotenv';
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

const program = new Command();

program
  .name('release-flow')
  .description('Automated release workflow')
  .action(async () => {
    logger.header('🚀 Starting Release Workflow');

    // 1. Pre-checks
    const rootDir = process.cwd();
    if (await hasUncommittedChanges(rootDir)) {
      logger.error('Git working directory is not clean. Commit your work before releasing.');
      logger.info('Release notes are generated from committed history (last tag..HEAD).');
      process.exit(1);
    }

    const { stdout: currentBranch } = await runGitCommand(
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      rootDir
    );
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      logger.warning(
        `You are on branch '${currentBranch}'. Releases are typically done from 'main'.`
      );
      const { proceed } = await inquirer.prompt([
        { type: 'confirm', name: 'proceed', message: 'Continue anyway?', default: false },
      ]);
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
          { name: 'custom', value: 'custom' },
        ],
      },
    ]);

    let newVersion = '';
    if (releaseType === 'custom') {
      const { version } = await inquirer.prompt([
        { type: 'input', name: 'version', message: 'Enter custom version:' },
      ]);
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
    const { stdout: describeStdout, exitCode: describeExitCode } = await runGitCommand(
      ['describe', '--tags', '--abbrev=0'],
      rootDir,
      false
    );

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
        language: process.env.LANGUAGE!,
      });

      // Get commits
      const { stdout: commitsRaw } = await runGitCommand(
        ['log', `${lastTag}..HEAD`, '--pretty=format:%h %s'],
        rootDir
      );

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

    // Update src/version.ts
    const versionTsPath = path.join(rootDir, 'src', 'version.ts');
    const versionTsContent = `export const version = '${newVersion}';
export const name = 'gitai';
export const engines = {
  node: '>=20'
};
`;
    await fs.writeFile(versionTsPath, versionTsContent, 'utf-8');

    // Update CHANGELOG.md
    const changelogPath = path.join(rootDir, 'CHANGELOG.md');
    let currentChangelog = '';
    try {
      currentChangelog = await fs.readFile(changelogPath, 'utf-8');
    } catch (error) {
      // A first release has no CHANGELOG yet; tolerate only "file not found".
      const isMissingFile = error instanceof Error && 'code' in error && error.code === 'ENOENT';
      if (!isMissingFile) {
        logger.error(
          `Failed to read CHANGELOG.md: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      }
    }

    const newChangelog = `${releaseNotes}\n\n---\n\n${currentChangelog}`;
    await fs.writeFile(changelogPath, newChangelog, 'utf-8');

    logger.success('Updated package.json, src/version.ts, and CHANGELOG.md');

    // 5. Commit & Tag
    const tag = `v${newVersion}`;
    // The annotated tag carries these notes so CI can publish them to the GitHub
    // Release without needing an AI API key in the pipeline. Reuse the same
    // message for the commit body so both stay in sync (and never empty).
    const tagMessage = releaseNotes.trim() || `Release ${tag}`;
    await runGitCommand(['add', 'package.json', 'src/version.ts', 'CHANGELOG.md'], rootDir);
    await runGitCommand(['commit', '-m', `chore: release ${tag}`, '-m', tagMessage], rootDir);

    await runGitCommand(['tag', '-a', tag, '-m', tagMessage], rootDir);
    logger.success(`Created annotated git tag ${tag}`);

    // 6. Push — pushing the tag triggers CI, which publishes to npm AND creates
    // the GitHub Release (notes from the tag + built artifact). No local `gh`.
    const { push } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'push',
        message: `Push branch and tag '${tag}' to origin?`,
        default: true,
      },
    ]);

    if (push) {
      logger.git('Pushing to origin...');
      await runGitCommand(['push', 'origin', currentBranch], rootDir);
      await runGitCommand(['push', 'origin', tag], rootDir);
      logger.success('🚀 Release pushed! CI will publish to npm and create the GitHub Release.');
    } else {
      logger.info(
        `Skipped push. Run "git push origin ${currentBranch} && git push origin ${tag}" to trigger the release.`
      );
    }
  });

program.parse();
