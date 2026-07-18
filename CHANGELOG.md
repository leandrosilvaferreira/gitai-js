# Release 1.3.0
This release brings a polished self-update experience, clearer documentation, and stronger CI/quality safeguards to keep development smooth and reliable.

### New Features
- Add self-update check with install confirmation (6d581c1)
- Wire self-update check into gitai's main command (0ff71fd)

### Bug Fixes
- Widen self-update's throttle-check try/catch to cover the config read (1aeafac)
- Log the underlying error when self-update install fails (e7400d7)
- Set import-x/extensions so no-cycle can see resolved .ts files (d1cbed3)
- Preserve markdown headers in release tag messages (162752a)

### Other Changes
- Clarify release-notes generator does not publish (e958f6d)
- Fix release runbook and make the release skill invocable (8066099)
- Document import-x/no-cycle extensions gotcha (f8ddd02)
- Add non-blocking coverage report step (eb6ff0f)
- Apply npm audit fix for transitive dev dependencies (b218039)
- Port lint/complexity/coverage quality gates from claude-agents-view-vscode (9095d71)

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.3.0](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.2.0...v1.3.0)

---

# Release 1.2.0

This release makes gitai's git pull/push flow safe against local data loss, replacing blind pulls with a smart sync that fast-forwards automatically, asks for confirmation before merging diverged branches, and aborts cleanly on conflict.

### New Features

- Fast-forward automatically when the remote has new commits and there's no divergence — no prompt needed, since it can never conflict or lose data.
- Ask for confirmation before attempting an automatic merge when local and remote branches have diverged, showing a preview of both sides first.
- Re-check the remote right before pushing to catch cases where it changed again since the last pull.

### Bug Fixes

- Replace fragile pull-conflict detection (previously matched only specific English/Portuguese text) with locale-independent git commands.
- Abort cleanly on merge conflicts — the working tree and all local commits are restored exactly, nothing is lost.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.2.0](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.1.1...v1.2.0)

---

# Release 1.1.1

A polished maintenance release with clearer project rules, improved README visibility, and streamlined CI workflows.

### New Features

- docs: add npm total downloads badge to README (475b628)

### Bug Fixes

- chore: remove failing PM workflows (PROJECTS_PAT not configured) (bbc53d4)

### Other Changes

- chore(.claude): translate project rules to English, switch large-file guard to block (f21e50c)

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.1.1](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.1.0...v1.1.1)

---

# Release 1.1.0

This release brings flexible custom LLM provider support, improved Anthropic configuration handling, and a smoother setup wizard—plus stronger tooling, security, and release automation improvements.

### New Features

- Support custom LLM endpoints with baseURL and authToken in AIService (fb241a9).
- Add optional BASE_URL field to AppConfig and ensure undefined fields are omitted when saving config (1ec1ce0).
- Add optional custom BASE_URL prompt to the setup wizard (9befe2f).
- Add readClaudeSettings utility to read Anthropic settings from ~/.claude/settings.json and settings.local.json (8ba4b89).
- Wire readClaudeSettings into AIService to support ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN from Claude settings files (9e4b44d).
- Add guided AI provider onboarding via add-provider skill (f62c2bc).

### Bug Fixes

- Prevent command injection in run-related-test hook by using execFileSync (0ae8b71).
- Resolve tsx via local node_modules/.bin in run-related-test hook (92e1304).
- Use npm pkg get version in release skill for ESM compatibility (288f8be).
- Correct branch check wording in release skill (master also accepted) (beb5354).

### Other Changes

- Add and refine documentation for custom LLM providers, .gitai.example, and Anthropic Claude auth/settings (EN + PT) (afea2b1, fab26db, 9fc2402).
- Upgrade verify-on-stop hook to strict blocking mode (5276be3).
- Update aia-harness tooling and add GitHub PM workflows (09b51f0).
- Add GitHub issue and PR templates (2381037).
- Add GitHub PM commands, config, and skills (d073db8).
- Add SDD task artifacts and security fix documentation updates (962e123, f53f29d).
- Add test step to verification rule (5e33258).
- Adjust ESLint configuration and ignores (3d16700, d5a36ec).
- Add run-related-test hook for automatic test execution on test file edits (a511662).
- Add block-lockfile hook to prevent direct lock file edits (ebce7f7).
- Add release skill and release-validator agent for guided pre-release checks (121f346,

---

# Release 1.0.10

This release modernizes the CI pipeline, upgrades to Node 24, and streamlines maintenance and permissions for a smoother development and release workflow.

### New Features

- Create GitHub Releases automatically from CI on tag push (2b68daf).

### Bug Fixes

- Drop stale Node 24 “Premature close” memory issue (ee735ac).

### Other Changes

- Upgrade to Node 24 and bump GitHub Actions to the latest versions (9cb8a07).
- Adjust Claude permissions configuration (76fb73d).
- Remove antigravity harness (cebd7ec).

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.10](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.0.9...v1.0.10)

---

# Release 1.0.9

This release makes the AI providers work on modern Node (20+) by upgrading the OpenAI, Anthropic, and Groq SDKs, routes gpt-5.x/o1/o3 through the Responses API, and hardens the release flow with a test + build gate.

### Bug Fixes

- Upgrade OpenAI SDK 4.104→6.44, Anthropic 0.36→0.105, and Groq 0.15→1.3 to drop the legacy node-fetch shim that throws "Premature close" on Node 24.
- Route OpenAI reasoning models (gpt-5.x, o1, o3) through the Responses API; chat-completions rejects them.

### New Features

- Auto-detect git tags in `release-notes` — `oldTag`/`newVersion` args are now optional.

### Other Changes

- Raise the Node floor to 20 (matching the upgraded SDKs; Node 18 is EOL).
- Gate `npm run release` on `npm test` + `npm run build` before any push.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.9](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.0.8...v1.0.9)

---

# Release 1.0.8

This release fixes a crash when using OpenAI reasoning models (gpt-5.x, o1, o3) — those models reject sampling parameters that were previously always sent.

### Bug Fixes

- Fix crash with gpt-5.2 and other OpenAI reasoning models: strip unsupported `temperature`, `top_p`, `frequency_penalty`, `presence_penalty` parameters that cause a 400 API error and `FetchError: Premature close`.

### New Features

- None.

### Other Changes

- Extract `isReasoningModel()` as a testable pure function; add unit tests for model detection and language utilities.
- Add `npm test` script, MCP server config, graphify tooling, and coding style docs.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.8](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.0.7...v1.0.8)

---

# Release 1.0.7

This release enhances commit message generation by now including deleted files for more complete and accurate summaries!

### New Features

- Include deleted files in commit message generation (3f159c8).

### Bug Fixes

- None.

### Other Changes

- None.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.7](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.0.6...v1.0.7)

---

# Release 1.0.6

This release refreshes the setup experience with updated default model selections for Groq and OpenAI, keeping configuration current and ready to use.

### New Features

- N/A

### Bug Fixes

- N/A

### Other Changes

- Update Groq default model in setup prompt (17b90aa, 021376c)
- Update Groq default model ID in setup prompt (8511a10)
- Update setup prompt and default OpenAI model to gpt-5.2 (9c2c1e2)

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.6](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.0.5...v1.0.6)

---

# Release 1.0.5

This release enhances the first-run experience with a smoother setup flow and helpful usage examples to get you productive faster!

### New Features

- Improve first-run setup flow with usage examples (c080723).

### Bug Fixes

- No bug fixes in this release.

### Other Changes

- No other changes in this release.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.5](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.0.4...v1.0.5)

---

# Release 1.0.4

This release improves the CLI experience by notifying users when a new version is available.

### New Features

- Notify users when a new CLI version is available (88e549c).

### Bug Fixes

- None.

### Other Changes

- None.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.4](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.0.3...v1.0.4)

---

# Release 1.0.3

This release improves the documentation with updated instructions and new guidance for using Claude Code.

### New Features

- N/A

### Bug Fixes

- N/A

### Other Changes

- Add Claude Code guidance and update instructions (2457668)

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.3](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.0.2...v1.0.3)

---

# Release 1.0.2

This release enhances commit message generation by ensuring newly added files are included in the generated git diff, improving accuracy and completeness.

### New Features

- Include new files in generated git diff for commit messages (833bce2)

### Bug Fixes

- No bug fixes in this release.

### Other Changes

- No other changes in this release.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.2](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.0.1...v1.0.2)

---

# Release 1.0.1

This release streamlines setup by reusing existing configuration and only prompting for missing values, making onboarding faster and smoother!

### New Features

- Reuse existing config and prompt only for missing setup values (46798b9).

### Bug Fixes

- None.

### Other Changes

- None.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.1](https://github.com/leandrosilvaferreira/gitai-js/compare/v1.0.0...v1.0.1)

---

# Release 1.0.0

This release improves the documentation with clearer prerequisites and updated recommendations for provider model selection, making it easier to get started and configure the project.

### New Features

- None.

### Bug Fixes

- None.

### Other Changes

- Update README prerequisites and provider model recommendations (bfd47e1).

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v1.0.0](https://github.com/leandrosilvaferreira/gitai-js/compare/v0.0.12...v1.0.0)

---

# Release 0.0.12

This release improves the documentation with updated installation instructions and clearer examples to help you get started faster!

### New Features

- None.

### Bug Fixes

- None.

### Other Changes

- Update README install command and add empty description examples (63e021a)

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v0.0.12](https://github.com/leandrosilvaferreira/gitai-js/compare/v0.0.11...v0.0.12)

---

# Release 0.0.11

This release streamlines the project by renaming the package to the new scoped name, improving clarity and distribution.

### New Features

- None.

### Bug Fixes

- None.

### Other Changes

- Rename package to scoped @notyped/gitai (05656e9).

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v0.0.11](https://github.com/leandrosilvaferreira/gitai-js/compare/v0.0.10...v0.0.11)

---

# Release 0.0.10

A documentation-focused update that refreshes the README with clearer setup instructions and bilingual usage guidance.

### New Features

- N/A

### Bug Fixes

- N/A

### Other Changes

- Revamp README with bilingual usage and setup guide (c174fa8)

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v0.0.10](https://github.com/leandrosilvaferreira/gitai-js/compare/v0.0.9...v0.0.10)

---

# Release 0.0.9

This release streamlines the project setup with a new package name, an improved build pipeline, and a small but important release notes fix.

### New Features

- Switch build pipeline to tsup and centralize app version metadata (ec14994)

### Bug Fixes

- Correct release notes changelog link text (82b4679)

### Other Changes

- Rename package to gitai-js (2223aee)

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for v0.0.9](https://github.com/leandrosilvaferreira/gitai-js/compare/v0.0.8...v0.0.9)

---

# Release 0.0.8

A small but important update improving the accuracy of the release documentation and changelog navigation.

### New Features

- None.

### Bug Fixes

- Fix full changelog compare URL to use the correct version tag (8344cd3).

### Other Changes

- None.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for 0.0.8](https://github.com/leandrosilvaferreira/gitai-js/compare/v0.0.7...v0.0.8)

---

# Release 0.0.7

This release improves the release process by fixing the GitHub compare link in the release message template.

### New Features

- None.

### Bug Fixes

- Correct GitHub compare link in release message template (09dce2d).

### Other Changes

- None.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for 0.0.7](https://github.com/leandrosilvaferreira/gitai-js/compare/v0.0.6...0.0.7)

---

# Release 0.0.6

This release improves the reliability of the release workflow by ensuring GitHub releases are created only after the tag has been successfully pushed.

### New Features

- None.

### Bug Fixes

- Create GitHub release only after pushing tag (c21ab1e).

### Other Changes

- None.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for 0.0.6](https://github.com/leandrosilvaferreira/gitai/compare/v0.0.5...0.0.6)

---

# Release 0.0.5

This release improves the release workflow by running GitHub CLI commands through execa for a more reliable and streamlined process.

### New Features

- N/A

### Bug Fixes

- N/A

### Other Changes

- Run GitHub CLI commands via execa in the release flow (1ec5599)

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for 0.0.5](https://github.com/leandrosilvaferreira/gitai/compare/v0.0.4...0.0.5)

---

# Release 0.0.4

This release improves the release workflow by enhancing the release script to better handle multiline commit messages and optionally create GitHub releases.

### New Features

- Enhance release script with multiline commits and optional GitHub releases (d075212)

### Bug Fixes

- None.

### Other Changes

- None.

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for 0.0.4](https://github.com/leandrosilvaferreira/gitai/compare/v0.0.3...0.0.4)

---

# Release 0.0.3

This release strengthens code quality and reliability with stricter TypeScript standards and improved CI enforcement.

### New Features

- None.

### Bug Fixes

- None.

### Other Changes

- Enforce stricter TypeScript linting and code standards (5af545e).
- Enforce lint and typecheck in CI and scripts (7e86b0c).

We thank all the contributors who made this release possible! For more details, please refer to the complete version notes.

**Full Changelog:** [See commits for 0.0.3](https://github.com/leandrosilvaferreira/gitai/compare/v0.0.2...0.0.3)

---

Initial release 0.0.2

---
