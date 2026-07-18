import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';

export default tseslint.config(
  { ignores: ['.claude/**', 'dist/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      sonarjs,
      'import-x': importX,
    },
    settings: {
      // Without this, import-x resolves '.js' specifiers as literal .js files
      // (this project's NodeNext convention points them at .ts sources), so it
      // can never build the dependency graph and import-x/no-cycle never fires.
      'import-x/resolver-next': [createTypeScriptImportResolver()],
      // Separate gate from the resolver above: ExportMap.for() discards any
      // resolved file whose extension isn't in this allowlist (default is
      // .js/.mjs/.cjs only) before it ever builds the export map, silently
      // and without logging — so .ts must be listed here too, or no-cycle
      // (and no-unresolved etc.) skip every import as if it were unresolved.
      'import-x/extensions': ['.ts'],
    },
    rules: {
      // Complexity
      complexity: ['error', 10], // Cyclomatic complexity
      'sonarjs/cognitive-complexity': ['error', 15], // Cognitive complexity
      'max-lines': ['error', { max: 355, skipBlankLines: true, skipComments: true }],

      // Cross-import / circular dependencies
      'import-x/no-cycle': 'error',

      // Strict TypeScript / clean code
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/max-params': ['error', { max: 3 }],
      '@typescript-eslint/unified-signatures': 'error',
      'no-process-exit': 'off',
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,ts}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    // The release scripts are async and can run unattended, so they get the same
    // *safety* rules as src/. The complexity/max-lines rules above stay off here on
    // purpose: release-flow's action handler is a linear sequence of guard clauses
    // (complexity 24), and splitting it further would scatter the release order
    // across files for a metric, not for readability. Known, deliberate debt.
    files: ['scripts/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        // Explicit: the default project service only discovers tsconfig.json, which
        // covers src/ only, so every file here would fail to parse.
        project: './tsconfig.scripts.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'no-process-exit': 'off',
    },
  },
  {
    files: ['scripts/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
  {
    // node:test's top-level `test(...)` calls are fire-and-forget by design
    // (the runner schedules them, callers never await the registration call),
    // and async test doubles legitimately implement an async contract without
    // awaiting anything inside. Both rules produce structural false positives here.
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  }
);
