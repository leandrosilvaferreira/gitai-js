#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import path from 'path';

import { AIService } from './services/ai.js';
import { checkConfigExists, loadConfig, validateNodeVersion } from './utils/config.js';
import { commitChanges, hasUncommittedChanges, isBranchAhead, performGitPull, runGitCommand } from './utils/git.js';
import { detectProjectLanguage, printDetectedLanguage } from './utils/language.js';
import { logger } from './utils/logger.js';
import { runSetup } from './utils/setup.js';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

// 0. Validate Node Version
if (!validateNodeVersion()) {
    console.error(chalk.red(`\n❌  GitAI requires Node.js ${pkg.engines?.node || '>=18'} or higher.`));
    console.error(chalk.yellow(`   Current version: ${process.version}\n`));
    process.exit(1);
}

const program = new Command();

program
  .name('gitai')
  .description('AI-powered git commit assistant')
  .version(pkg.version);

program
    .argument('[projectPath]', 'The path to the project', '.')
    .argument('[baseMessage]', 'The base commit message')
    .option('-p, --push', 'Whether to push after committing', false)
    .action(async (projectPathArg, baseMessageArg, options) => {
        
        // 1. Configuration Check (Global Only)
        let config;
        try {
            if (!checkConfigExists()) {
                config = await runSetup();
            } else {
                config = loadConfig();
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to load configuration: ${errorMessage}`);
            process.exit(1);
        }

        logger.header(`Gitai v${pkg.version}`);
        
        const projectPath = path.resolve(projectPathArg);
        logger.info(`📁 project_path: ${projectPath}\n`);

        const aiService = new AIService({
            provider: config.PROVIDER,
            model: config.MODEL,
            apiKey: config.API_KEY,
            language: config.LANGUAGE
        });

        // Change process CWD to project path to ensure git commands run there
        try {
            process.chdir(projectPath);
        } catch {
            logger.error(`Failed to change directory to ${projectPath}`);
            process.exit(1);
        }

        // 2. Check for uncommitted changes
        if (await hasUncommittedChanges(projectPath)) {
            logger.warning('Uncommitted local changes detected.');
            
            const projectLanguage = await detectProjectLanguage(projectPath);
            printDetectedLanguage(projectLanguage);
            
            const { stdout: diffOutput } = await runGitCommand(['diff'], projectPath);
            
            // Generate commit message
            // Allow empty base message (will rely on git diffs)
            const baseMessage = baseMessageArg || '';

            const commitMessage = await aiService.generateCommitMessage(diffOutput, projectLanguage, baseMessage);
            
            logger.commit(commitMessage);
            
            await commitChanges(commitMessage, projectPath);
            logger.success('Gitai successfully committed local changes.');
            
        } else {
            logger.info('No local changes to commit before git pull.');
        }

        // 3. Perform Git Pull
        const pullSuccessful = await performGitPull(projectPath);
        
        if (!pullSuccessful) {
            logger.error('Git pull failed due to conflicts. Please resolve the conflicts manually.');
            process.exit(1);
        }

        // 4. Check for conflicts/changes after pull
        if (await hasUncommittedChanges(projectPath)) {
             logger.warning('Conflicts or uncommitted changes detected after pull.');
             
             const projectLanguage = await detectProjectLanguage(projectPath);
             printDetectedLanguage(projectLanguage);
             
             const { stdout: diffOutput } = await runGitCommand(['diff'], projectPath);
             
             const commitMessage = await aiService.generateCommitMessage(diffOutput, projectLanguage, "Resolving conflicts after git pull");
             logger.commit(commitMessage);
             
             await commitChanges(commitMessage, projectPath);
             logger.success('Gitai successfully committed changes after pull.');

        } else {
             logger.info('No changes to commit after git pull.');
        }

        // 5. Push if requested
        if (options.push) {
            if (await isBranchAhead(projectPath)) {
                await runGitCommand(['push'], projectPath);
                logger.success('Gitai successfully pushed changes.');
            } else {
                logger.info('No changes to push. The local branch is synchronized with the remote.');
            }
        }

  });

program.parse();
