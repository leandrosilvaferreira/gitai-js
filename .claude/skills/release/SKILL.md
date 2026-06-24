---
name: release
description: Guided pre-release validation and release execution for gitai npm package
user-invocable: false
---

# Release Skill

Guides Claude through pre-release validation and safe release execution for the `@notyped/gitai` npm package.

## Pre-Release Checklist

Before invoking `npm run release`, verify all of these pass:

1. **No uncommitted changes**

   ```bash
   git status --porcelain
   ```

   Output must be empty. If there are changes, commit them first.

2. **On correct branch (main or master)**

   ```bash
   git branch --show-current
   ```

   Must output `main` or `master`. Releases from other branches will prompt for confirmation.

3. **Tests pass**

   ```bash
   npm run test
   ```

   All tests must pass. Fix any failing tests before releasing.

4. **Build is clean**

   ```bash
   npm run build
   ```

   Build must succeed with no errors. Fix any lint/typecheck errors first.

5. **Version not already published**

   ```bash
   npm view @notyped/gitai version
   ```

   Compare this output with the version in `package.json`. If they match, increment the version first using the release script (which prompts for patch/minor/major).

6. **Tag doesn't already exist**
   ```bash
   git tag -l v$(node -p "require('./package.json').version")
   ```
   Output must be empty. If the tag exists, the version has already been released.

## Release Execution

Once all pre-release checks pass, invoke the full release workflow:

```bash
npm run release
```

This command:

1. Runs tests again (`npm test`)
2. Builds the package (`npm run build`)
3. Executes the release flow (`tsx scripts/release-flow.ts`)

The release flow will:

- Prompt for release type (patch/minor/major/custom)
- Generate release notes from git history using AI
- Update `package.json`, `src/version.ts`, and `CHANGELOG.md`
- Create a commit: `chore: release v<version>`
- Create an annotated git tag with release notes
- Prompt to push the branch and tag to `origin`

**Important:** The annotated tag carries the release notes so CI can publish them to the GitHub Release without needing an AI API key in the pipeline.

## Post-Release

After `npm run release` completes and you push the tag:

1. **GitHub Release is created automatically by CI**
   - Check: https://github.com/leandrosilvaferreira/gitai-js/releases
   - CI reads release notes from the annotated tag
   - Release should appear within a few minutes

2. **npm publish happens automatically by CI**
   - CI builds and publishes to npm registry
   - Check: https://www.npmjs.com/package/@notyped/gitai
   - New version should be available within a few minutes

3. **Verify release is live**
   ```bash
   npm info @notyped/gitai
   ```
   Confirm the new version appears in the registry.

## When to Use This Skill

- Before any release to npm
- When incrementing package version
- When publishing new features or bug fixes
- When generating release notes for stakeholders

## When NOT to Use This Skill

- During development or feature branches
- When testing the release process (use `npm run release` on a test branch first)
- When emergency rollback is needed (contact maintainers, do NOT reuse a version tag)
