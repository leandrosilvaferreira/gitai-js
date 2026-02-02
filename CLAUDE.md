# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gitai is a CLI tool that uses AI to automatically generate conventional commit messages and release notes. It analyzes git diffs, detects project language, and generates structured commit messages following the Conventional Commits standard (feat, fix, docs, chore).

The tool supports three AI providers: OpenAI, Groq, and Anthropic.

## Development Commands

### Building
```bash
npm run build          # Lint + compile TypeScript with TSUP
npm run dev            # Watch mode for development
```

### Code Quality
```bash
npm run lint           # Run ESLint + TypeScript type checking
npm run format         # Format code with Prettier
```

### Testing Locally
```bash
npm link               # Link CLI globally for local testing
gitai . ''             # Test the CLI in any directory
```

### Release Notes Generation
```bash
npm run release-notes -- <old-tag> <new-version>
# Example: npm run release-notes -- v0.0.1 v0.0.2
# Requires .env with PROVIDER, MODEL, API_KEY, LANGUAGE
```

### Release Flow
```bash
npm run release        # Automated release workflow
```

## Architecture

### Core Flow (index.ts)

The main CLI entry point follows this sequence:

1. **Node version validation** - Requires Node.js >=18
2. **Configuration loading** - Loads from `~/.gitai` or triggers setup wizard
3. **Pre-commit check** - Analyzes uncommitted changes before pull
4. **Git pull** - Fetches remote changes
5. **Post-pull check** - Handles conflicts after pull
6. **Optional push** - If `--push` flag provided

### Key Components

**AIService (services/ai.ts)**
- Unified interface for OpenAI, Groq, and Anthropic providers
- Two main operations:
  - `generateCommitMessage()` - Creates conventional commit messages
  - `generateReleaseNotes()` - Generates release documentation
- Provider-specific handling for model parameters (e.g., `max_completion_tokens` vs `max_tokens` for newer OpenAI models)
- Strict prompt engineering to enforce Conventional Commits format

**Configuration (utils/config.ts)**
- Global config stored at `~/.gitai` with secure permissions (mode 0o600)
- Simple key=value format parser
- Four required fields: LANGUAGE, PROVIDER, API_KEY, MODEL

**Git Operations (utils/git.ts)**
- All git commands use `execa` for robust subprocess handling
- Commit messages written to temp files to handle special characters correctly
- Conflict detection supports both English and Portuguese git output
- `getDiffWithNewFiles()` - Stages all changes (including new files) before generating diff
  - Uses `git add .` followed by `git diff --cached` to capture both modified and new files
  - Allows AI to analyze content of newly created files, not just modifications
  - Git automatically filters binary files (shows "Binary files differ" instead of content)

**Setup Wizard (utils/setup.ts)**
- Interactive configuration on first run
- Reuses existing config values when re-running setup
- Validates provider-specific model selections

### Release Notes Tool (releaser.ts)

Separate CLI tool that:
- Uses git log to extract commits since a tag
- Generates categorized markdown release notes
- Requires environment variables (not ~/.gitai config)
- Outputs to `dist/release_<version>.md`

## Conventional Commits Standard

The tool strictly enforces these prefixes:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance/minor fixes

Message format:
```
<prefix>: <concise description>

<detailed explanation of changes, reasons, and impact>

🤖 Commit generated with [GitaiJS](https://github.com/leandrosilvaferreira/gitai-js)
```

## Build Configuration

**TSUP (tsup.config.ts)**
- ESM-only output (no CommonJS)
- Target: Node.js 18
- Single entry point: `src/index.ts`
- Minified with sourcemaps

**ESLint (eslint.config.js)**
- TypeScript-first configuration
- Strict rules: no-explicit-any, no-unused-vars as errors
- Exception: `no-process-exit` disabled (CLI tool needs process.exit)

## Important Notes

- The project uses ES modules (`"type": "module"` in package.json)
- All imports must use `.js` extension (not `.ts`) for ESM compatibility
- No test framework currently configured
- Configuration file stores API keys - never commit `.gitai` files
- Git operations change `process.cwd()` to the target project path
- **Files are staged before generating commit messages** - This allows the AI to analyze both modified and newly created files. If message generation fails, files remain staged and can be committed manually or unstaged with `git reset`
