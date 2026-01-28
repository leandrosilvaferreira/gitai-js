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
}

export const CONFIG_PATH = path.join(os.homedir(), '.gitai');

export const checkConfigExists = (): boolean => {
    try {
        return fs.existsSync(CONFIG_PATH);
    } catch {
        return false;
    }
};

export const loadConfig = (): AppConfig => {
    if (!checkConfigExists()) {
        throw new Error(`Configuration file not found at ${CONFIG_PATH}`);
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config: Record<string, string> = {};
    content.split('\n').forEach(line => {
        // Simple env parsing
        const [key, ...value] = line.split('=');
        if (key && value && key.trim()) {
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

export const saveConfig = (config: AppConfig): void => {
    const content = Object.entries(config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    // Write with secure permissions (600 - read/write only by owner) since it contains API keys
    fs.writeFileSync(CONFIG_PATH, content, { mode: 0o600 });
};

export const validateNodeVersion = (): boolean => {
    const requiredVersion = engines.node;
    return semver.satisfies(process.version, requiredVersion);
};
