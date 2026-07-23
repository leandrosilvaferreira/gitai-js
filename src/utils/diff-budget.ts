// Pure string-based helpers for reducing an oversized `git diff` before it is sent
// to an AI provider. No imports from the rest of the project on purpose: this keeps
// the dependency direction services -> utils intact (ai.ts imports this module, not
// the other way around) and avoids any import-x/no-cycle risk.

export interface DiffFileEntry {
  path: string;
  header: string;
  body: string;
  additions: number;
  deletions: number;
  changeType: 'added' | 'modified';
}

export const DEFAULT_REDUCED_DIFF_MAX_CHARS = 20_000;

const DIFF_HEADER_PATTERN = /^diff --git a\/(.+?) b\/(.+)$/;
const HUNK_MARKER_PATTERN = /^@@ /;

const LOCK_FILE_NAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'npm-shrinkwrap.json',
  'Cargo.lock',
  'poetry.lock',
  'Pipfile.lock',
  'composer.lock',
  'Gemfile.lock',
  'go.sum',
]);

const GENERATED_DIR_NAMES = new Set(['dist', 'build']);
const MINIFIED_FILE_PATTERN = /\.min\.[^/.]+$/;

export function isLockOrGeneratedFile(filePath: string): boolean {
  const segments = filePath.split('/');
  const basename = segments.at(-1) ?? filePath;

  if (LOCK_FILE_NAMES.has(basename) || MINIFIED_FILE_PATTERN.test(basename)) {
    return true;
  }
  return segments.some((segment) => GENERATED_DIR_NAMES.has(segment));
}

function countBodyChanges(bodyLines: string[]): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of bodyLines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions += 1;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions += 1;
    }
  }
  return { additions, deletions };
}

function parseChunk(lines: string[]): DiffFileEntry {
  const match = DIFF_HEADER_PATTERN.exec(lines[0]);
  const path = match ? match[2] : lines[0];

  const hunkIndex = lines.findIndex((line) => HUNK_MARKER_PATTERN.test(line));
  const headerLines = hunkIndex === -1 ? lines : lines.slice(0, hunkIndex);
  const bodyLines = hunkIndex === -1 ? [] : lines.slice(hunkIndex);

  const header = headerLines.join('\n');
  const { additions, deletions } = countBodyChanges(bodyLines);
  const changeType: DiffFileEntry['changeType'] = header.includes('new file mode')
    ? 'added'
    : 'modified';

  return { path, header, body: bodyLines.join('\n'), additions, deletions, changeType };
}

// Splits a `git diff` (as produced by getDiffWithNewFiles) into one entry per file.
export function splitDiffByFile(diffOutput: string): DiffFileEntry[] {
  if (diffOutput.trim().length === 0) {
    return [];
  }

  const chunks: string[][] = [];
  let current: string[] | undefined;

  for (const line of diffOutput.split('\n')) {
    if (DIFF_HEADER_PATTERN.test(line)) {
      if (current) {
        chunks.push(current);
      }
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) {
    chunks.push(current);
  }

  return chunks.map(parseChunk);
}

type EntryDecision =
  | { kind: 'full' }
  | { kind: 'truncated'; keepLines: number; totalLines: number }
  | { kind: 'placeholder' };

function entrySize(entry: DiffFileEntry): number {
  return entry.header.length + entry.body.length;
}

// Keeps as many whole lines of `entry.body` as fit in `remainingBudget`, in order.
function truncateToBudget(entry: DiffFileEntry, remainingBudget: number): EntryDecision {
  const availableForBody = Math.max(remainingBudget - entry.header.length, 0);
  const bodyLines = entry.body.length > 0 ? entry.body.split('\n') : [];

  let keepLines = 0;
  let usedChars = 0;
  for (const line of bodyLines) {
    const lineCost = line.length + 1; // +1 accounts for the joining newline
    if (usedChars + lineCost > availableForBody) {
      break;
    }
    usedChars += lineCost;
    keepLines += 1;
  }

  return { kind: 'truncated', keepLines, totalLines: bodyLines.length };
}

function renderEntry(entry: DiffFileEntry, decision: EntryDecision): string {
  if (decision.kind === 'placeholder') {
    return `${entry.header}\n[gitai] diff omitted (${entry.changeType}, +${entry.additions} -${entry.deletions})`;
  }
  if (decision.kind === 'full') {
    return entry.body.length > 0 ? `${entry.header}\n${entry.body}` : entry.header;
  }

  const bodyLines = entry.body.length > 0 ? entry.body.split('\n') : [];
  const kept = bodyLines.slice(0, decision.keepLines).join('\n');
  const remainingLines = decision.totalLines - decision.keepLines;
  const keptSection = kept.length > 0 ? `${kept}\n` : '';
  return `${entry.header}\n${keptSection}... truncated, ${remainingLines} more lines`;
}

// Greedy single-pass reduction: lockfiles/generated files always collapse to a
// 1-line placeholder; the rest are kept whole in ascending size order while they
// fit the budget, the first one that overflows is truncated, and anything larger
// after that becomes a placeholder too. Everything is re-emitted in the original
// diff order so the output stays readable.
export function buildReducedDiff(
  entries: readonly DiffFileEntry[],
  maxChars: number = DEFAULT_REDUCED_DIFF_MAX_CHARS
): string {
  const decisions = new Map<DiffFileEntry, EntryDecision>();
  const reducible: DiffFileEntry[] = [];

  for (const entry of entries) {
    if (isLockOrGeneratedFile(entry.path)) {
      decisions.set(entry, { kind: 'placeholder' });
    } else {
      reducible.push(entry);
    }
  }

  const bySizeAscending = [...reducible].sort((a, b) => entrySize(a) - entrySize(b));

  let remainingBudget = maxChars;
  let hasTruncatedOne = false;
  for (const entry of bySizeAscending) {
    if (hasTruncatedOne) {
      decisions.set(entry, { kind: 'placeholder' });
      continue;
    }

    const size = entrySize(entry);
    if (size <= remainingBudget) {
      decisions.set(entry, { kind: 'full' });
      remainingBudget -= size;
      continue;
    }

    decisions.set(entry, truncateToBudget(entry, remainingBudget));
    hasTruncatedOne = true;
  }

  return entries
    .map((entry) => renderEntry(entry, decisions.get(entry) ?? { kind: 'placeholder' }))
    .join('\n');
}

// One line per file, no diff content at all: path + changeType + line counters.
export function buildFileListSummary(entries: readonly DiffFileEntry[]): string {
  return entries
    .map((entry) => `${entry.path} (${entry.changeType}, +${entry.additions} -${entry.deletions})`)
    .join('\n');
}

// Builds the fallback ladder for generateCommitMessage: the diff as-is, then a
// budget-reduced version, then a content-free file list. Collapses to a single
// variant when there is nothing to split (e.g. a deletion-only diff, which is
// already empty by the time it reaches here).
export function buildDiffVariants(
  diffOutput: string,
  maxChars: number = DEFAULT_REDUCED_DIFF_MAX_CHARS
): string[] {
  const entries = splitDiffByFile(diffOutput);
  if (entries.length === 0) {
    return [diffOutput];
  }

  return [diffOutput, buildReducedDiff(entries, maxChars), buildFileListSummary(entries)];
}
