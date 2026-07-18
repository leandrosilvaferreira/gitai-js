import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

const indicatorFiles: Record<string, string[]> = {
  'Node.js': ['package.json', 'yarn.lock', 'package-lock.json', 'npm-shrinkwrap.json'],
  Python: ['requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py', 'setup.cfg', 'manage.py'],
  Java: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'build.xml', '.java-version'],
  Go: ['go.mod', 'Gopkg.lock'],
  PHP: ['composer.json', 'composer.lock', 'index.php'],
  Ruby: ['Gemfile', 'Gemfile.lock', 'Rakefile', 'config.ru', '.ruby-version'],
  Rust: ['Cargo.toml', 'Cargo.lock'],
  Haskell: ['stack.yaml', 'cabal.project'],
  Swift: ['Package.swift'],
  Elixir: ['mix.exs'],
  Dart: ['pubspec.yaml'],
  Scala: ['build.sbt'],
  Perl: ['Makefile.PL', 'Build.PL'],
  R: ['.Rproj'],
};

const extensionIndicators: Record<string, string[]> = {
  'C#': ['.csproj', '.sln'],
  Haskell: ['.cabal'],
  Swift: ['.xcodeproj', '.xcworkspace'],
  Kotlin: ['.kt', '.kts'],
  'C/C++': ['.c', '.cpp', '.h', '.hpp'],
  JavaScript: ['.js', '.jsx'],
  TypeScript: ['.ts', '.tsx'],
  Python: ['.py'],
  Java: ['.java'],
};

const languageEmojis: Record<string, string> = {
  'Node.js': '🟢',
  Python: '🐍',
  Java: '☕',
  Go: '🐹',
  PHP: '🐘',
  Ruby: '💎',
  Rust: '🦀',
  Haskell: '🎩',
  Swift: '🍎',
  Elixir: '💧',
  Dart: '🎯',
  Scala: '⚖️',
  Perl: '🐪',
  R: '📊',
  'C#': '🔷',
  'C/C++': '⚙️',
  JavaScript: '🟨',
  TypeScript: '🔷',
  Unknown: '❓',
};

export function getLanguageEmoji(language: string): string {
  return languageEmojis[language] || '❓';
}

export function printDetectedLanguage(language: string): void {
  const emoji = getLanguageEmoji(language);
  logger.info(`${emoji} Linguagem detectada: ${language}\n`);
}

function findLanguageByIndicatorFile(rootFiles: string[]): string | undefined {
  for (const [language, indicators] of Object.entries(indicatorFiles)) {
    const isMatch = indicators.some(
      (indicator) => !indicator.includes(path.sep) && rootFiles.includes(indicator)
    );
    if (isMatch) {
      return language;
    }
  }
  return undefined;
}

function findLanguageByExtension(rootFiles: string[]): string | undefined {
  for (const [language, extensions] of Object.entries(extensionIndicators)) {
    const isMatch = rootFiles.some((file) => extensions.some((ext) => file.endsWith(ext)));
    if (isMatch) {
      return language;
    }
  }
  return undefined;
}

export async function detectProjectLanguage(projectPath: string): Promise<string> {
  try {
    const rootFiles = await fs.readdir(projectPath);
    return (
      findLanguageByIndicatorFile(rootFiles) ?? findLanguageByExtension(rootFiles) ?? 'Unknown'
    );
  } catch {
    return 'Unknown';
  }
}
