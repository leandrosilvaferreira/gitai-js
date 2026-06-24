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
