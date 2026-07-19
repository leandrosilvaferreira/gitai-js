#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';
import path from 'path';

import { AIService } from './services/ai.js';
import {
  type AppConfig,
  checkConfigExists,
  loadConfig,
  validateNodeVersion,
} from './utils/config.js';
import {
  commitChanges,
  getDeletedFiles,
  getDiffWithNewFiles,
  getSyncStatus,
  hasUncommittedChanges,
  runGitCommand,
  syncWithRemote,
} from './utils/git.js';
import { detectProjectLanguage, printDetectedLanguage } from './utils/language.js';
import { logger } from './utils/logger.js';
import {
  checkForSelfUpdate,
  createSelfUpdateDeps,
  fetchVersionInfo,
  installPackageUpdate,
  runUpdateCommand,
  type SelfUpdateOutcome,
} from './utils/self-update.js';
import { runSetup } from './utils/setup.js';
import { type ClaudeEnvSettings, readClaudeSettings } from './utils/claude-settings.js';

import { engines, name, version } from './version.js';

const PACKAGE_NAME = '@notyped/gitai';

// 0. Validate Node Version
if (!validateNodeVersion()) {
  console.error(chalk.red(`\n❌  GitAI requires Node.js ${engines.node} or higher.`));
  console.error(chalk.yellow(`   Current version: ${process.version}\n`));
  process.exit(1);
}

async function confirmAutoMerge(projectPath: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    logger.warning('Non-interactive session: cannot ask for merge confirmation. Skipping merge.');
    return false;
  }

  const { stdout: localLog } = await runGitCommand(
    ['log', '--oneline', '@{u}..HEAD'],
    projectPath,
    false
  );
  const { stdout: remoteLog } = await runGitCommand(
    ['log', '--oneline', 'HEAD..@{u}'],
    projectPath,
    false
  );

  logger.info('Local commits not on remote:');
  logger.info(localLog || '(none)');
  logger.info('Remote commits not local:');
  logger.info(remoteLog || '(none)');

  const answers = await inquirer.prompt<{ proceed: boolean }>([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Attempt an automatic merge?',
      default: true,
    },
  ]);

  return answers.proceed;
}

interface ProgramOptions {
  push: boolean;
}

async function resolveConfig(): Promise<{ config: AppConfig; isFirstRun: boolean }> {
  if (!checkConfigExists()) {
    return { config: await runSetup(), isFirstRun: true };
  }
  return { config: loadConfig(), isFirstRun: false };
}

function printFirstRunWelcome(): void {
  console.log('');
  console.log(chalk.green('✅ GitAI installed and configured successfully!'));
  console.log('');
  console.log('Now you can run it inside any git repository.');
  console.log('');
  console.log(chalk.yellow('Examples:'));
  console.log('');
  console.log(chalk.green('    $ gitai'));
  console.log(chalk.dim('    Run in current directory'));
  console.log('');
  console.log(chalk.green('    $ gitai . "feat: initial commit"'));
  console.log(chalk.dim('    Run with base message'));
  console.log('');
  console.log(chalk.green('    $ gitai . --push'));
  console.log(chalk.dim('    Run and push changes (base message is optional)'));
  console.log('');
  console.log(chalk.green('    $ gitai . "feat: wip" --push'));
  console.log(chalk.dim('    Run with base message and push'));
  console.log('');
}

function buildAIService(config: AppConfig, claudeSettings: ClaudeEnvSettings): AIService {
  return new AIService({
    provider: config.PROVIDER,
    model: config.MODEL,
    apiKey: config.API_KEY,
    language: config.LANGUAGE,
    baseURL:
      config.BASE_URL ||
      (config.PROVIDER === 'anthropic' ? claudeSettings.ANTHROPIC_BASE_URL : undefined),
    authToken: config.PROVIDER === 'anthropic' ? claudeSettings.ANTHROPIC_AUTH_TOKEN : undefined,
  });
}

async function commitLocalChangesIfAny(
  projectPath: string,
  aiService: AIService,
  baseMessageArg: string | undefined
): Promise<void> {
  if (!(await hasUncommittedChanges(projectPath))) {
    logger.info('No local changes to commit before git pull.');
    return;
  }

  logger.warning('Uncommitted local changes detected.');

  const projectLanguage = await detectProjectLanguage(projectPath);
  printDetectedLanguage(projectLanguage);

  const diffOutput = await getDiffWithNewFiles(projectPath);
  const deletedFiles = await getDeletedFiles(projectPath);

  const commitMessage = await aiService.generateCommitMessage({
    diffOutput,
    deletedFiles,
    projectLanguage,
    baseMessage: baseMessageArg || '',
  });

  logger.commit(commitMessage);

  await commitChanges(commitMessage, projectPath);
  logger.success('Gitai successfully committed local changes.');
}

async function pushIfRequested(projectPath: string): Promise<void> {
  await runGitCommand(['fetch'], projectPath);
  const prePushStatus = await getSyncStatus(projectPath);

  if (prePushStatus.behind > 0) {
    logger.error('Remote branch changed again since the pull. Please run gitai again.');
    process.exit(1);
  }

  if (prePushStatus.ahead > 0) {
    await runGitCommand(['push'], projectPath);
    logger.success('Gitai successfully pushed changes.');
  } else {
    logger.info('No changes to push. The local branch is synchronized with the remote.');
  }
}

function handleUpdateOutcome(outcome: SelfUpdateOutcome): void {
  if (outcome === 'declined') {
    logger.info('Update declined. Continuing with the current version.');
  }
  if (outcome === 'install-failed') {
    logger.warning('Automatic update failed. Continuing with the current version.');
  }
}

const program = new Command();

program.name(name).description('AI-powered git commit assistant').version(version);

// Custom help handler to show version
program.on('--help', () => {
  console.log('');
  console.log(chalk.cyan('━'.repeat(50)));
  console.log(chalk.bold.blue(`  GitAI v${version}`));
  console.log(chalk.dim('  AI-powered git commit assistant'));
  console.log(chalk.cyan('━'.repeat(50)));
  console.log('');
  console.log(chalk.yellow('  Examples:'));
  console.log('');
  console.log(chalk.green('    $ gitai'));
  console.log(chalk.dim('    Run in current directory'));
  console.log('');
  console.log(chalk.green('    $ gitai . "feat: initial commit"'));
  console.log(chalk.dim('    Run with base message'));
  console.log('');
  console.log(chalk.green('    $ gitai . --push'));
  console.log(chalk.dim('    Run and push changes (base message is optional)'));
  console.log('');
  console.log(chalk.green('    $ gitai . "feat: wip" --push'));
  console.log(chalk.dim('    Run with base message and push'));
  console.log('');
  console.log(chalk.green('    $ gitai update'));
  console.log(chalk.dim('    Check for a new version and install it if available'));
  console.log('');
});

program
  .command('update')
  .description('Check for a new gitai version and install it if available')
  .action(async () => {
    const outcome = await runUpdateCommand({
      currentVersion: version,
      fetchVersionInfo: () => fetchVersionInfo(PACKAGE_NAME, version),
      installUpdate: (latestVersion) => installPackageUpdate(PACKAGE_NAME, latestVersion),
    });

    if (outcome === 'check-failed' || outcome === 'update-failed') {
      process.exit(1);
    }
  });

program
  .argument('[projectPath]', 'The path to the project', '.')
  .argument('[baseMessage]', 'The base commit message (Optional)')
  .option('-p, --push', 'Whether to push after committing', false)
  .action(
    async (projectPathArg: string, baseMessageArg: string | undefined, options: ProgramOptions) => {
      // 1. Configuration Check (Global Only)
      let config: AppConfig;
      let isFirstRun: boolean;
      try {
        ({ config, isFirstRun } = await resolveConfig());
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to load configuration: ${errorMessage}`);
        process.exit(1);
      }

      if (isFirstRun) {
        printFirstRunWelcome();
        process.exit(0);
      }

      logger.header(`Gitai v${version}`);

      const updateOutcome = await checkForSelfUpdate(createSelfUpdateDeps(PACKAGE_NAME, version));
      if (updateOutcome === 'installed') {
        process.exit(0);
      }
      handleUpdateOutcome(updateOutcome);

      const projectPath = path.resolve(projectPathArg);
      logger.info(`📁 project_path: ${projectPath}\n`);

      const claudeSettings = readClaudeSettings();
      const aiService = buildAIService(config, claudeSettings);

      // Change process CWD to project path to ensure git commands run there
      try {
        process.chdir(projectPath);
      } catch {
        logger.error(`Failed to change directory to ${projectPath}`);
        process.exit(1);
      }

      // 2. Commit local changes, if any
      await commitLocalChangesIfAny(projectPath, aiService, baseMessageArg);

      // 3. Sync with remote (fetch, then fast-forward or confirmed merge)
      const syncResult = await syncWithRemote(projectPath, () => confirmAutoMerge(projectPath));

      if (syncResult === 'conflict') {
        process.exit(1);
      }

      if (syncResult === 'declined') {
        process.exit(0);
      }

      // 4. Push if requested — re-check the remote first (it may have moved again)
      if (options.push) {
        await pushIfRequested(projectPath);
      }
    }
  );

program.parse();
