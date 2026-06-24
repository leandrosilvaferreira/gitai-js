import { Command } from 'commander';
import dotenv from 'dotenv';
import path from 'path';

import fs from 'fs/promises';
import { AIService } from './services/ai.js';
import { runGitCommand } from './utils/git.js';
import { logger } from './utils/logger.js';

dotenv.config();

// Helper to get commits since tag
async function getCommitMessagesSinceTag(tag: string): Promise<string[]> {
  const { stdout } = await runGitCommand(['log', `${tag}..HEAD`, '--pretty=format:%h %s']);
  return stdout.split('\n');
}

async function resolveTagArgs(
  argOldTag?: string,
  argNewVersion?: string
): Promise<{ oldTag: string; newVersion: string }> {
  const { stdout } = await runGitCommand(['tag', '--sort=-version:refname']);
  const tags = stdout
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  if (tags.length < 2 && !argOldTag) {
    logger.error('Need at least 2 git tags to auto-detect oldTag. Pass it explicitly.');
    process.exit(1);
  }

  // Template prepends "v" (v${newVersion}), so newVersion must be bare (e.g. "1.0.8").
  // Accept tags/args with or without the "v" prefix and normalize.
  const newVersion = (argNewVersion ?? tags[0]).replace(/^v/, '');
  const oldTag = argOldTag ?? tags[1];

  logger.info(`Auto-detected: oldTag=${oldTag}  newVersion=${newVersion}`);
  return { oldTag, newVersion };
}

const program = new Command();

program
  .name('gitai-release')
  .description('Git release notes generator')
  .argument('[oldTag]', 'The old Git tag (auto-detected if omitted)')
  .argument('[newVersion]', 'The new release version (auto-detected if omitted)')
  .action(async (argOldTag?: string, argNewVersion?: string) => {
    const { oldTag, newVersion } = await resolveTagArgs(argOldTag, argNewVersion);
    logger.header(`Generating release notes from ${oldTag} to ${newVersion}`);

    // Validate Env Vars
    const requiredVars = ['PROVIDER', 'MODEL', 'API_KEY', 'LANGUAGE'];
    const missingVars = requiredVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
      logger.error(
        `The following environment variables are not set or blank: ${missingVars.join(', ')}`
      );
      process.exit(1);
    }

    const aiService = new AIService({
      provider: process.env.PROVIDER!,
      model: process.env.MODEL!,
      apiKey: process.env.API_KEY!,
      language: process.env.LANGUAGE!,
    });

    try {
      const commits = await getCommitMessagesSinceTag(oldTag);

      if (commits.length === 0 || (commits.length === 1 && commits[0] === '')) {
        logger.warning(`No commits found between ${oldTag} and HEAD.`);
        process.exit(0);
      }

      const formattedCommits = commits.join('\n');

      const releaseNotes = await aiService.generateReleaseNotes(
        formattedCommits,
        newVersion,
        oldTag
      );

      const distDir = path.join(process.cwd(), 'dist');
      await fs.mkdir(distDir, { recursive: true });

      const releaseFilename = path.join(distDir, `release_${newVersion}.md`);
      await fs.writeFile(releaseFilename, releaseNotes, 'utf-8');

      logger.success(`Release notes successfully generated in ${releaseFilename}.`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to generate release notes: ${errorMessage}`);
      process.exit(1);
    }
  });

program.parse();
