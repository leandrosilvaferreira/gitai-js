import semver from 'semver';

export type BumpType = 'patch' | 'minor' | 'major';

const BUMP_TYPES = ['patch', 'minor', 'major'] as const;

const isBumpType = (value: string): value is BumpType =>
  (BUMP_TYPES as readonly string[]).includes(value);

// `feat!:` / `fix(scope)!:` — the `!` is the Conventional Commits breaking marker.
const BREAKING_SUBJECT = /^\w+(\([^)]*\))?!:/;
const FEATURE_SUBJECT = /^feat(\([^)]*\))?:/;
// Per spec the breaking footer is its own line in the BODY, never the subject —
// so this must be matched against the full message, not `git log --pretty=%s`.
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m;

/**
 * Infer the release bump from full Conventional Commit messages (subject + body).
 *
 * Breaking marker wins over `feat:`, `feat:` wins over everything else. Anything
 * unrecognised counts as a patch — this repo only allows feat/fix/docs/chore.
 */
export function suggestBumpType(messages: string[]): BumpType {
  let hasFeature = false;

  for (const message of messages) {
    const trimmed = message.trim();
    if (!trimmed) continue;

    const subject = (trimmed.split('\n')[0] ?? '').trim();
    if (BREAKING_SUBJECT.test(subject) || BREAKING_FOOTER.test(trimmed)) {
      return 'major';
    }
    if (FEATURE_SUBJECT.test(subject)) {
      hasFeature = true;
    }
  }

  return hasFeature ? 'minor' : 'patch';
}

export interface VersionOptions {
  /** patch | minor | major | auto */
  type?: string;
  /** Explicit semver, mutually exclusive with `type`. */
  version?: string;
  /** Full commit messages since the last tag — only read when type is `auto`. */
  messages?: string[];
}

/**
 * Resolve the version to cut from CLI options. Throws with an actionable message
 * rather than returning a bad version — a wrong bump here gets published.
 */
export function resolveTargetVersion(current: string, options: VersionOptions): string {
  const { type, version, messages = [] } = options;

  if (type && version) {
    throw new Error('Use either --type or --version, not both.');
  }

  if (version) {
    // Normalise: semver.valid('v1.5.0') accepts it and returns '1.5.0'. Returning the
    // raw input would write "v1.5.0" into package.json and tag it "vv1.5.0" — and the
    // v-prefixed form is exactly what this tool prints everywhere, so users type it.
    const cleaned = semver.valid(version);
    if (!cleaned) {
      throw new Error(`Invalid semver version: '${version}'.`);
    }
    if (!semver.gt(cleaned, current)) {
      throw new Error(`Version ${cleaned} must be greater than the current version ${current}.`);
    }
    return cleaned;
  }

  if (!type) {
    throw new Error('No release type given. Pass --type <patch|minor|major|auto> or --version.');
  }

  const resolvedType = type === 'auto' ? suggestBumpType(messages) : type;

  if (!isBumpType(resolvedType)) {
    throw new Error(`Invalid release type: '${type}'. Use patch, minor, major or auto.`);
  }

  // `resolvedType` is narrowed to BumpType here, which is assignable to ReleaseType.
  const next = semver.inc(current, resolvedType);
  if (!next) {
    throw new Error(`Could not bump '${current}' by '${resolvedType}'.`);
  }

  return next;
}
