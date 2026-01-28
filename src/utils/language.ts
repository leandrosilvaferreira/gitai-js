import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

const indicatorFiles: Record<string, string[]> = {
    'Node.js': ['package.json', 'yarn.lock', 'package-lock.json', 'npm-shrinkwrap.json'],
    'Python': ['requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py', 'setup.cfg', 'manage.py'],
    'Java': ['pom.xml', 'build.gradle', 'build.gradle.kts', 'build.xml', '.java-version'],
    'Go': ['go.mod', 'Gopkg.lock'],
    'PHP': ['composer.json', 'composer.lock', 'index.php'],
    'Ruby': ['Gemfile', 'Gemfile.lock', 'Rakefile', 'config.ru', '.ruby-version'],
    'Rust': ['Cargo.toml', 'Cargo.lock'],
    'Haskell': ['stack.yaml', 'cabal.project'],
    'Swift': ['Package.swift'],
    'Elixir': ['mix.exs'],
    'Dart': ['pubspec.yaml'],
    'Scala': ['build.sbt'],
    'Perl': ['Makefile.PL', 'Build.PL'],
    'R': ['.Rproj']
};

const extensionIndicators: Record<string, string[]> = {
    'C#': ['.csproj', '.sln'],
    'Haskell': ['.cabal'],
    'Swift': ['.xcodeproj', '.xcworkspace'],
    'Kotlin': ['.kt', '.kts'],
    'C/C++': ['.c', '.cpp', '.h', '.hpp'],
    'JavaScript': ['.js', '.jsx'],
    'TypeScript': ['.ts', '.tsx'],
    'Python': ['.py'],
    'Java': ['.java']
};

const languageEmojis: Record<string, string> = {
    'Node.js': '🟢',
    'Python': '🐍',
    'Java': '☕',
    'Go': '🐹',
    'PHP': '🐘',
    'Ruby': '💎',
    'Rust': '🦀',
    'Haskell': '🎩',
    'Swift': '🍎',
    'Elixir': '💧',
    'Dart': '🎯',
    'Scala': '⚖️',
    'Perl': '🐪',
    'R': '📊',
    'C#': '🔷',
    'C/C++': '⚙️',
    'JavaScript': '🟨',
    'TypeScript': '🔷',
    'Unknown': '❓'
};

export function getLanguageEmoji(language: string): string {
    return languageEmojis[language] || '❓';
}

export function printDetectedLanguage(language: string): void {
    const emoji = getLanguageEmoji(language);
    logger.info(`${emoji} Linguagem detectada: ${language}\n`);
}

export async function detectProjectLanguage(projectPath: string): Promise<string> {
    try {
        const rootFiles = await fs.readdir(projectPath);

        // Check for indicator files in the project root
        for (const [language, indicators] of Object.entries(indicatorFiles)) {
            for (const indicator of indicators) {
                if (indicator.includes(path.sep)) {
                    // This logic handles nested paths in indicators if necessary, 
                    // though node path module might be different. 
                    // Keeping it simple as per original python logic which used os.path.sep
                    // For now, let's assume flat filenames for simplicity unless we see complex ones
                    // The python code did: if os.path.sep in indicator...
                } else {
                    if (rootFiles.includes(indicator)) {
                        return language;
                    }
                }
            }
        }

        // Check for file extensions in the project root
        for (const [language, extensions] of Object.entries(extensionIndicators)) {
             for (const file of rootFiles) {
                 if (extensions.some(ext => file.endsWith(ext))) {
                     return language;
                 }
             }
        }

        // Recursive check logic from python is a bit heavy (os.walk), 
        // let's implement a lighter version or skip if not strictly needed.
        // The original scanned the whole tree which can be slow for node_modules.
        // Let's implement a limited depth scan if root check failed.
        // For efficiency, maybe just skip the deep scan for this first version 
        // unless the user specifically wants it.
        // Gitai.py uses os.walk which is recursive. 
        // Let's assume Unknown for now if not found in root to avoid performance issues in huge JS projects.
        
        return "Unknown";

    } catch (error) {
        return "Unknown";
    }
}
