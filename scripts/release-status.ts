import { execa } from 'execa';
import semver from 'semver';
import { runGitCommand } from '../src/utils/git.js';
import { logger } from '../src/utils/logger.js';

/** `v1.2.0` → `1.2.0`; returns null for tags that are not semver at all. */
const cleanTag = (tag: string): string | null => semver.valid(semver.coerce(tag));

const VERIFY_ATTEMPTS = 20;
const VERIFY_INTERVAL_MS = 15_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export type ReleaseVerdict =
  | 'in-sync'
  | 'unreleased-commits'
  | 'version-not-tagged'
  | 'tag-not-pushed'
  | 'ci-pending'
  | 'publish-failed';

export interface ReleaseState {
  packageName: string;
  pkgVersion: string;
  /** Version currently on the npm registry, or null when unreachable/unpublished. */
  npmVersion: string | null;
  lastTag: string | null;
  tagPushed: boolean;
  unreleasedCount: number;
  /** publish.yml conclusion for the tagged commit; null while running or unknown. */
  ciConclusion: string | null;
}

export interface ReleaseDiagnosis {
  verdict: ReleaseVerdict;
  message: string;
  nextStep: string | null;
}

/**
 * Turn the gathered facts into a verdict.
 *
 * Order matters: a version that was cut but never reached npm is more urgent than
 * commits waiting to be released — that is the `v1.0.8` failure mode, where CI went
 * green, `npm publish` 404'd, and nobody noticed for two releases.
 */
export function diagnoseRelease(state: ReleaseState): ReleaseDiagnosis {
  const { packageName, pkgVersion, npmVersion, lastTag, tagPushed, unreleasedCount } = state;
  const tag = `v${pkgVersion}`;

  if (lastTag === tag && !tagPushed) {
    return {
      verdict: 'tag-not-pushed',
      message: `${tag} exists locally but is not on origin — nothing was ever published.`,
      nextStep: `git push origin HEAD && git push origin ${tag}`,
    };
  }

  if (lastTag === tag && tagPushed && npmVersion !== pkgVersion) {
    if (state.ciConclusion === null) {
      return {
        verdict: 'ci-pending',
        message: `${tag} is on origin; publish.yml has not finished yet (npm still on ${npmVersion ?? 'unknown'}).`,
        nextStep: 'Wait for CI, then re-run this check.',
      };
    }

    return {
      verdict: 'publish-failed',
      message: `${tag} is on origin and CI finished '${state.ciConclusion}', but npm still serves ${npmVersion ?? 'nothing'}. The publish did NOT land.`,
      nextStep:
        'Read the publish.yml run log, then cut a new patch (npm forbids reusing a version).',
    };
  }

  // package.json was bumped past the last tag: the release commit landed but `git tag`
  // never did (signing misconfigured, interrupted run). Reporting this as ordinary
  // unreleased commits would suggest re-running the flow, silently skipping this version.
  const lastTagVersion = lastTag ? cleanTag(lastTag) : null;
  if (
    lastTagVersion &&
    lastTag !== tag &&
    npmVersion !== pkgVersion &&
    semver.gt(pkgVersion, lastTagVersion)
  ) {
    return {
      verdict: 'version-not-tagged',
      message: `package.json is at ${pkgVersion} but the newest tag is ${lastTag} — the version bump was committed and never tagged.`,
      nextStep: `git tag -a ${tag} -m "Release ${tag}" && git push origin ${tag}`,
    };
  }

  if (unreleasedCount > 0) {
    return {
      verdict: 'unreleased-commits',
      message: `${unreleasedCount} commit(s) since ${lastTag ?? 'the initial commit'} are not released. Committing and pushing does NOT publish — only pushing a v* tag does.`,
      nextStep: 'npm run release -- --type auto',
    };
  }

  return {
    verdict: 'in-sync',
    message: `${packageName}@${pkgVersion} is published and there is nothing left to release.`,
    nextStep: null,
  };
}

/** Latest version on the npm registry, or null when unreachable/unpublished. */
export async function fetchNpmVersion(packageName: string): Promise<string | null> {
  const { stdout, exitCode } = await execa('npm', ['view', packageName, 'version'], {
    reject: false,
  });
  return exitCode === 0 && stdout.trim() ? stdout.trim() : null;
}

/**
 * publish.yml conclusion for `sha`, or null when still running, absent, or when
 * `gh` is missing/unauthenticated — the caller must treat null as "unknown".
 */
export async function fetchCiConclusion(sha: string): Promise<string | null> {
  const { stdout, exitCode } = await execa(
    'gh',
    [
      'run',
      'list',
      '--workflow=publish.yml',
      '--limit',
      '20',
      '--json',
      'headSha,status,conclusion',
    ],
    { reject: false }
  );

  if (exitCode !== 0) return null;
  return parseCiConclusion(stdout, sha);
}

/**
 * Pull the conclusion for `sha` out of `gh run list --json` output.
 *
 * Every unexpected shape resolves to null ("unknown"), never to a verdict — the
 * caller treats unknown as "not proven published", so failing closed is correct.
 */
export function parseCiConclusion(stdout: string, sha: string): string | null {
  try {
    const runs: unknown = JSON.parse(stdout);
    if (!Array.isArray(runs)) return null;

    const run = runs.find(
      (candidate): candidate is { headSha: string; status: string; conclusion: string | null } =>
        typeof candidate === 'object' &&
        candidate !== null &&
        'headSha' in candidate &&
        (candidate as { headSha: unknown }).headSha === sha
    );

    return run && run.status === 'completed' ? (run.conclusion ?? null) : null;
  } catch {
    return null;
  }
}

export async function gatherReleaseState(
  rootDir: string,
  packageName: string,
  pkgVersion: string
): Promise<ReleaseState> {
  const { stdout: lastTagRaw, exitCode: describeExit } = await runGitCommand(
    ['describe', '--tags', '--abbrev=0'],
    rootDir,
    false
  );
  const lastTag = describeExit === 0 && lastTagRaw ? lastTagRaw : null;

  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  const { stdout: countRaw } = await runGitCommand(['rev-list', '--count', range], rootDir, false);
  const unreleasedCount = Number.parseInt(countRaw, 10) || 0;

  let tagPushed = false;
  let taggedSha = '';
  if (lastTag) {
    // Independent: one is a network round-trip, the other is local. Do not serialise.
    const [{ stdout: remoteTag }, { stdout: sha }] = await Promise.all([
      runGitCommand(['ls-remote', '--tags', 'origin', lastTag], rootDir, false),
      runGitCommand(['rev-list', '-n', '1', lastTag], rootDir, false),
    ]);
    tagPushed = remoteTag.trim().length > 0;
    taggedSha = sha.trim();
  }

  const [npmVersion, ciConclusion] = await Promise.all([
    fetchNpmVersion(packageName),
    taggedSha && tagPushed ? fetchCiConclusion(taggedSha) : Promise.resolve(null),
  ]);

  return { packageName, pkgVersion, npmVersion, lastTag, tagPushed, unreleasedCount, ciConclusion };
}

/** Read-only report: where the release stands and what to run next. */
export async function printStatus(
  rootDir: string,
  packageName: string,
  pkgVersion: string
): Promise<void> {
  logger.header('Release status');

  const state = await gatherReleaseState(rootDir, packageName, pkgVersion);
  const diagnosis = diagnoseRelease(state);

  logger.info(`Package:      ${state.packageName}`);
  logger.info(`Local:        ${state.pkgVersion}`);
  logger.info(`npm registry: ${state.npmVersion ?? 'not published'}`);
  logger.info(`Last tag:     ${state.lastTag ?? 'none'}${state.tagPushed ? '' : ' (local only)'}`);
  logger.info(`Unreleased:   ${state.unreleasedCount} commit(s)`);

  if (diagnosis.verdict === 'in-sync') {
    logger.success(diagnosis.message);
    return;
  }

  logger.warning(diagnosis.message);
  if (diagnosis.nextStep) logger.info(`Next: ${diagnosis.nextStep}`);
}

/**
 * Block until the registry actually serves `version`, then exit non-zero if it never does.
 *
 * npm is the only source of truth for "did it publish" — a green CI run is not.
 * `v1.0.8` passed tests and build, then 404'd on `npm publish`, and npm's history
 * still skips 1.0.7 → 1.0.9 because nobody checked the registry.
 */
export async function verifyPublish(
  packageName: string,
  version: string,
  tag: string
): Promise<void> {
  const budgetMinutes = Math.round((VERIFY_ATTEMPTS * VERIFY_INTERVAL_MS) / 60_000);
  logger.git(`Waiting for publish.yml to publish ${tag} (up to ~${budgetMinutes} min)...`);

  for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++) {
    const published = await fetchNpmVersion(packageName);
    if (published === version) {
      logger.success(`${packageName}@${version} is live on npm.`);
      return;
    }

    if (attempt === VERIFY_ATTEMPTS) break;
    // Heartbeat every 4th poll so a multi-minute wait is not silent.
    if (attempt % 4 === 0) {
      logger.info(`Still waiting — npm serves ${published ?? 'nothing'} so far.`);
    }
    await sleep(VERIFY_INTERVAL_MS);
  }

  logger.error(`${packageName}@${version} did not reach npm within ~${budgetMinutes} min.`);
  logger.info('Read the run log: gh run list --workflow=publish.yml --limit 1');
  logger.info('Re-check any time with: npm run release:status');
  logger.info('If the publish step failed, cut a NEW patch — npm forbids reusing a version.');
  process.exit(1);
}
