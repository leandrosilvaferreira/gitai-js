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

const program = new Command();

program
  .name('gitai-release')
  .description('Git release notes generator')
  .argument('<oldTag>', 'The old Git tag')
  .argument('<newVersion>', 'The new release version')
  .action(async (oldTag, newVersion) => {
    logger.header(`Generating release notes from ${oldTag} to ${newVersion}`);
    
    // Validate Env Vars
    const requiredVars = ['PROVIDER', 'MODEL', 'API_KEY', 'LANGUAGE'];
    const missingVars = requiredVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
        logger.error(`The following environment variables are not set or blank: ${missingVars.join(', ')}`);
        process.exit(1);
    }

    const aiService = new AIService({
        provider: process.env.PROVIDER!,
        model: process.env.MODEL!,
        apiKey: process.env.API_KEY!,
        language: process.env.LANGUAGE!
    });

    try {
        const commits = await getCommitMessagesSinceTag(oldTag);
        
        if (commits.length === 0 || (commits.length === 1 && commits[0] === '')) {
             logger.warning(`No commits found between ${oldTag} and HEAD.`);
             process.exit(0);
        }

        const formattedCommits = commits.join('\n');
        
        const releaseNotes = await aiService.generateReleaseNotes(formattedCommits, newVersion, oldTag);

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
