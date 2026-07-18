import fs from 'fs/promises';
import path from 'path';
import { runGitCommand } from '../src/utils/git.js';
import { logger } from '../src/utils/logger.js';

/**
 * Write the new version into package.json, src/version.ts and CHANGELOG.md.
 *
 * `pkg` is mutated in place because the caller holds the same object it later reads
 * `name` from — keeping one source of truth for what gets written to disk.
 */
export async function writeReleaseFiles(
  rootDir: string,
  pkg: Record<string, unknown>,
  newVersion: string,
  releaseNotes: string
): Promise<void> {
  pkg.version = newVersion;
  await fs.writeFile(path.join(rootDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  const versionTsContent = `export const version = '${newVersion}';
export const name = 'gitai';
export const engines = {
  node: '>=20'
};
`;
  await fs.writeFile(path.join(rootDir, 'src', 'version.ts'), versionTsContent, 'utf-8');

  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  let currentChangelog = '';
  try {
    currentChangelog = await fs.readFile(changelogPath, 'utf-8');
  } catch (error: unknown) {
    // A first release has no CHANGELOG yet; tolerate only "file not found".
    const isMissingFile = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    if (!isMissingFile) {
      logger.error(
        `Failed to read CHANGELOG.md: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  }

  await fs.writeFile(changelogPath, `${releaseNotes}\n\n---\n\n${currentChangelog}`, 'utf-8');
  logger.success('Updated package.json, src/version.ts, and CHANGELOG.md');
}

/**
 * Commit the bump and create the annotated tag that carries the release notes.
 *
 * CI reads the notes back out of the tag, which is how rich release notes reach the
 * GitHub Release without an AI API key in the pipeline.
 */
export async function commitAndTag(
  rootDir: string,
  tag: string,
  releaseNotes: string
): Promise<void> {
  // Reuse the same message for the commit body so both stay in sync (and never empty).
  const tagMessage = releaseNotes.trim() || `Release ${tag}`;

  await runGitCommand(['add', 'package.json', 'src/version.ts', 'CHANGELOG.md'], rootDir);
  await runGitCommand(['commit', '-m', `chore: release ${tag}`, '-m', tagMessage], rootDir);

  // --cleanup=verbatim: git tag strips lines starting with "#" by default (unlike
  // git commit with -m), which silently ate every "### <heading>" in these notes.
  await runGitCommand(['tag', '-a', tag, '-m', tagMessage, '--cleanup=verbatim'], rootDir);
  logger.success(`Created annotated git tag ${tag}`);
}
