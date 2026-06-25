import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface ClaudeEnvSettings {
  ANTHROPIC_AUTH_TOKEN?: string;
  ANTHROPIC_BASE_URL?: string;
}

function parseSettings(filePath: string): ClaudeEnvSettings {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') return {};
    const env = (parsed as Record<string, unknown>)['env'];
    if (env === null || typeof env !== 'object') return {};
    const record = env as Record<string, unknown>;
    const result: ClaudeEnvSettings = {};
    if (typeof record['ANTHROPIC_AUTH_TOKEN'] === 'string') {
      result.ANTHROPIC_AUTH_TOKEN = record['ANTHROPIC_AUTH_TOKEN'];
    }
    if (typeof record['ANTHROPIC_BASE_URL'] === 'string') {
      result.ANTHROPIC_BASE_URL = record['ANTHROPIC_BASE_URL'];
    }
    return result;
  } catch {
    return {};
  }
}

export function readClaudeSettings(
  baseDir: string = path.join(os.homedir(), '.claude')
): ClaudeEnvSettings {
  const base = parseSettings(path.join(baseDir, 'settings.json'));
  const local = parseSettings(path.join(baseDir, 'settings.local.json'));
  return { ...base, ...local };
}
