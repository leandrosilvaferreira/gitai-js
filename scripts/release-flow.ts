import { Command } from 'commander';
import dotenv from 'dotenv';
import inquirer from 'inquirer';
import { createRequire } from 'module';
import { AIService } from '../src/services/ai.js';
import { hasUncommittedChanges, runGitCommand } from '../src/utils/git.js';
import { logger } from '../src/utils/logger.js';
import { commitAndTag, writeReleaseFiles } from './release-apply.js';
import { printStatus, verifyPublish } from './release-status.js';
import { type BumpType, resolveTargetVersion, suggestBumpType } from './release-version.js';

interface PackageJson {
  name: string;
  version: string;
  [key: string]: unknown;
}

const require = createRequire(import.meta.url);
// Cast once: an untyped require makes `pkg.name`/`pkg.version` `any`, which then
// silently spreads through every call that takes them.
const pkg = require('../package.json') as PackageJson;

dotenv.config();

const REQUIRED_ENV = ['PROVIDER', 'MODEL', 'API_KEY', 'LANGUAGE'] as const;

interface ReleaseFlowOptions {
  status?: boolean;
  type?: string;
  version?: string;
  yes?: boolean;
  /** Commander's `--no-push` default: true unless the flag is passed. */
  push: boolean;
}

interface ReleaseNotesConfig {
  provider: string;
  model: string;
  apiKey: string;
  language: string;
}

/**
 * Release notes are generated from a repo-root `.env` (dotenv), NOT from `~/.gitai`.
 * Checked before any prompt so a missing key fails in one second instead of after
 * the user has already picked a release type. Returns the validated values so
 * callers never need a non-null assertion on `process.env`.
 */
function readReleaseNotesEnv(): ReleaseNotesConfig {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error(`Missing ${missing.join(', ')} in the repo-root .env (see .env.sample).`);
    logger.info('Release notes are generated locally via dotenv — ~/.gitai is NOT used here.');
    process.exit(1);
  }

  return {
    provider: process.env.PROVIDER as string,
    model: process.env.MODEL as string,
    apiKey: process.env.API_KEY as string,
    language: process.env.LANGUAGE as string,
  };
}

const fail = (error: unknown): never => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
};

/** Decide the version to cut: explicit flags first, then the interactive wizard. */
async function resolveVersion(
  options: ReleaseFlowOptions,
  currentVersion: string,
  messages: string[],
  context: { interactive: boolean; suggested: BumpType; lastTag: string }
): Promise<string> {
  const { interactive, suggested, lastTag } = context;

  if (options.type || options.version) {
    try {
      return resolveTargetVersion(currentVersion, {
        type: options.type,
        version: options.version,
        messages,
      });
    } catch (error: unknown) {
      return fail(error);
    }
  }

  if (!interactive) {
    logger.error('Non-interactive run needs --type <patch|minor|major|auto> or --version <x.y.z>.');
    logger.info(`Conventional Commits since ${lastTag || 'start'} suggest: ${suggested}.`);
    process.exit(1);
  }

  const preview = (type: BumpType): string =>
    `${type} (${resolveTargetVersion(currentVersion, { type })})`;

  const { releaseType } = await inquirer.prompt<{ releaseType: BumpType | 'custom' }>([
    {
      type: 'list',
      name: 'releaseType',
      message: 'Select release type:',
      default: suggested,
      choices: [
        { name: preview('patch'), value: 'patch' },
        { name: preview('minor'), value: 'minor' },
        { name: preview('major'), value: 'major' },
        { name: 'custom', value: 'custom' },
      ],
    },
  ]);

  if (releaseType !== 'custom') {
    return resolveTargetVersion(currentVersion, { type: releaseType });
  }

  const { version } = await inquirer.prompt<{ version: string }>([
    { type: 'input', name: 'version', message: 'Enter custom version:' },
  ]);

  try {
    return resolveTargetVersion(currentVersion, { version });
  } catch (error: unknown) {
    return fail(error);
  }
}

const program = new Command();

program
  .name('release-flow')
  .description('Automated release workflow')
  .option('--status', 'report where the release stands and exit (no changes)')
  .option('-t, --type <type>', 'release type: patch | minor | major | auto')
  .option('-v, --version <version>', 'explicit semver version to cut')
  .option('-y, --yes', 'push without asking for confirmation')
  .option('--no-push', 'create the commit and tag but do not push')
  .action(async (options: ReleaseFlowOptions) => {
    const rootDir = process.cwd();

    if (options.status) {
      await printStatus(rootDir, pkg.name, pkg.version);
      return;
    }

    logger.header('🚀 Starting Release Workflow');

    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

    // 1. Pre-checks
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
      // `--yes` authorises the push, NOT releasing off main. Without a human to ask,
      // an unexpected branch is always a stop — its commits would feed the notes too.
      if (!interactive) {
        logger.error(`Refusing to release from '${currentBranch}' non-interactively.`);
        logger.info('Switch to main, or run interactively to confirm.');
        process.exit(1);
      }
      {
        const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
          { type: 'confirm', name: 'proceed', message: 'Continue anyway?', default: false },
        ]);
        if (!proceed) process.exit(0);
      }
    }

    // 2. Read history first — it feeds both the env check and the bump suggestion.
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
    }

    let messages: string[] = [];
    let notesConfig: ReleaseNotesConfig | null = null;
    if (lastTag) {
      notesConfig = readReleaseNotesEnv();
      // %B (subject + body), NUL-separated: a `BREAKING CHANGE:` footer lives in the
      // body, so %s alone would make breaking releases look like patches.
      const { stdout: messagesRaw } = await runGitCommand(
        ['log', `${lastTag}..HEAD`, '--pretty=format:%B%x00'],
        rootDir
      );
      messages = messagesRaw
        .split('\0')
        .map((message) => message.trim())
        .filter(Boolean);
    }

    if (lastTag && messages.length === 0) {
      logger.error(`No commits since ${lastTag}.`);
      logger.info('If a release was cut but never finished, run: npm run release:status');
      process.exit(1);
    }

    // 3. Versioning
    logger.info(`Current version: ${pkg.version}`);
    const suggested = suggestBumpType(messages);

    const newVersion = await resolveVersion(options, pkg.version, messages, {
      interactive,
      suggested,
      lastTag,
    });

    logger.info(`Target version: ${newVersion} (Conventional Commits suggest: ${suggested})`);

    // Fail here rather than on a raw `git tag` error after the AI notes are paid for.
    // Check origin too: a tag pushed by an earlier run but absent from a fresh clone
    // would otherwise only blow up at `git push`, stranding a local commit and tag.
    const tag = `v${newVersion}`;
    const [{ stdout: localTag }, { stdout: remoteTag }] = await Promise.all([
      runGitCommand(['tag', '-l', tag], rootDir, false),
      runGitCommand(['ls-remote', '--tags', 'origin', tag], rootDir, false),
    ]);
    if (localTag.trim() || remoteTag.trim()) {
      const where = localTag.trim()
        ? remoteTag.trim()
          ? 'locally and on origin'
          : 'locally'
        : 'on origin';
      logger.error(`Tag ${tag} already exists ${where}.`);
      logger.info(`Delete it first: git tag -d ${tag} && git push origin :refs/tags/${tag}`);
      process.exit(1);
    }

    // 4. Generate Notes
    let releaseNotes = '';
    if (lastTag && notesConfig) {
      logger.ai(`Generating release notes from ${lastTag} to HEAD...`);
      const aiService = new AIService(notesConfig);

      const { stdout: commitsRaw } = await runGitCommand(
        ['log', `${lastTag}..HEAD`, '--pretty=format:%h %s'],
        rootDir
      );

      try {
        releaseNotes = await aiService.generateReleaseNotes(commitsRaw, newVersion, lastTag);
      } catch (error) {
        logger.error(
          `Failed to generate release notes: ${error instanceof Error ? error.message : String(error)}`
        );
        logger.info('Nothing was committed or tagged. Fix the provider config and re-run.');
        process.exit(1);
      }
    } else {
      releaseNotes = `Initial release ${newVersion}`;
    }

    // Print them: they become the CHANGELOG, the commit body, and the public GitHub
    // Release. Unattended runs still leave them in the log for an audit trail.
    logger.info('Release notes:');
    logger.info(`\n${releaseNotes.trim()}\n`);

    // 5. Update files, commit and tag
    await writeReleaseFiles(rootDir, pkg, newVersion, releaseNotes);
    await commitAndTag(rootDir, tag, releaseNotes);

    // 7. Push — pushing the tag triggers CI, which publishes to npm AND creates
    // the GitHub Release (notes from the tag + built artifact). No local `gh`.
    const pushHint = `git push origin ${currentBranch} && git push origin ${tag}`;

    if (!options.push) {
      logger.info(`Skipped push. Run "${pushHint}" to trigger the release.`);
      return;
    }

    let shouldPush = Boolean(options.yes);
    if (!shouldPush) {
      if (!interactive) {
        logger.error('Non-interactive run needs --yes to push, or --no-push to stop here.');
        logger.info(`Commit and tag are ready locally. Run "${pushHint}" when you decide.`);
        process.exit(1);
      }
      const answer = await inquirer.prompt<{ push: boolean }>([
        {
          type: 'confirm',
          name: 'push',
          message: `Push branch and tag '${tag}' to origin?`,
          default: true,
        },
      ]);
      shouldPush = answer.push;
    }

    if (!shouldPush) {
      logger.info(`Skipped push. Run "${pushHint}" to trigger the release.`);
      return;
    }

    logger.git('Pushing to origin...');
    await runGitCommand(['push', 'origin', currentBranch], rootDir);
    await runGitCommand(['push', 'origin', tag], rootDir);
    logger.success('🚀 Release pushed! CI will publish to npm and create the GitHub Release.');

    // 8. Verify against the registry — a green CI run does not prove the publish landed.
    await verifyPublish(pkg.name, newVersion, tag);
  });

// parseAsync, not parse: the action handler is async, and `parse()` does not await it,
// so any rejection inside (an inquirer ExitPromptError on Ctrl+C, a failed fs.writeFile)
// escapes as an unhandled rejection and prints a raw stack trace instead of a logger error.
try {
  await program.parseAsync();
} catch (error: unknown) {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
