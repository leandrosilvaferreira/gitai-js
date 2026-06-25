import fs from 'fs';
import os from 'os';
import path from 'path';
import semver from 'semver';

import { engines } from '../version.js';

export interface AppConfig {
  LANGUAGE: string;
  PROVIDER: string;
  API_KEY: string;
  MODEL: string;
  BASE_URL?: string;
}

export const CONFIG_PATH = path.join(os.homedir(), '.gitai');

export const checkConfigExists = (configPath: string = CONFIG_PATH): boolean => {
  try {
    return fs.existsSync(configPath);
  } catch {
    return false;
  }
};

export const loadConfig = (configPath: string = CONFIG_PATH): AppConfig => {
  if (!checkConfigExists(configPath)) {
    throw new Error(`Configuration file not found at ${configPath}`);
  }
  const content = fs.readFileSync(configPath, 'utf-8');
  const config: Record<string, string> = {};
  content.split('\n').forEach((line) => {
    // Simple env parsing
    const [key, ...value] = line.split('=');
    if (key && key.trim() && value.length > 0) {
      // Rejoin value in case it contained =
      let val = value.join('=').trim();

      // Remove quotes if present
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      if (val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      }

      config[key.trim()] = val;
    }
  });
  return config as unknown as AppConfig;
};

export const saveConfig = (config: AppConfig, configPath: string = CONFIG_PATH): void => {
  const content =
    (Object.entries(config) as [string, string | undefined][])
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';

  // Write with secure permissions (600 - read/write only by owner) since it contains API keys
  fs.writeFileSync(configPath, content, { mode: 0o600 });
};

export const validateNodeVersion = (): boolean => {
  const requiredVersion = engines.node;
  return semver.satisfies(process.version, requiredVersion);
};
