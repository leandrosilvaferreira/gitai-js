import { execa } from 'execa';
import inquirer from 'inquirer';
import updateNotifier, { type UpdateInfo } from 'update-notifier';

import { logger } from './logger.js';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export type SelfUpdateOutcome = 'no-update' | 'declined' | 'installed' | 'install-failed';

export interface SelfUpdateDeps {
  fetchLatest: () => Promise<UpdateInfo | undefined>;
  confirmInstall: (info: UpdateInfo) => Promise<boolean>;
  installUpdate: (info: UpdateInfo) => Promise<void>;
}

export async function checkForSelfUpdate(deps: SelfUpdateDeps): Promise<SelfUpdateOutcome> {
  const info = await deps.fetchLatest();
  if (!info) {
    return 'no-update';
  }

  const shouldInstall = await deps.confirmInstall(info);
  if (!shouldInstall) {
    return 'declined';
  }

  try {
    await deps.installUpdate(info);
    return 'installed';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Automatic update failed: ${message}`);
    return 'install-failed';
  }
}

export function createSelfUpdateDeps(pkgName: string, currentVersion: string): SelfUpdateDeps {
  const notifier = updateNotifier({ pkg: { name: pkgName, version: currentVersion } });

  return {
    fetchLatest: async () => {
      try {
        const lastCheck = notifier.config?.get<number>('lastUpdateCheck') ?? 0;
        if (Date.now() - lastCheck < ONE_DAY_MS) {
          return undefined;
        }

        const info = await notifier.fetchInfo();
        notifier.config?.set('lastUpdateCheck', Date.now());
        return info.type === 'latest' ? undefined : info;
      } catch {
        return undefined;
      }
    },
    confirmInstall: async (info) => {
      if (!process.stdin.isTTY) {
        return false;
      }

      const answers = await inquirer.prompt<{ proceed: boolean }>([
        {
          type: 'confirm',
          name: 'proceed',
          message: `gitai ${info.latest} is available (current: ${info.current}). Update now?`,
          default: true,
        },
      ]);

      return answers.proceed;
    },
    installUpdate: async (info) => installPackageUpdate(pkgName, info.latest),
  };
}

// Always fetches fresh (no throttle check) and returns info even when
// already latest — unlike fetchLatest (used by createSelfUpdateDeps),
// which hides "latest" and respects the 1x/day throttle.
export async function fetchVersionInfo(
  pkgName: string,
  currentVersion: string
): Promise<UpdateInfo | undefined> {
  try {
    const notifier = updateNotifier({ pkg: { name: pkgName, version: currentVersion } });
    const info = await notifier.fetchInfo();
    notifier.config?.set('lastUpdateCheck', Date.now());
    return info;
  } catch {
    return undefined;
  }
}

// Extracted out of createSelfUpdateDeps's installUpdate closure so both
// the background auto-update and the explicit `update` command share one
// install path (no duplicated npm-install logic).
export async function installPackageUpdate(pkgName: string, latestVersion: string): Promise<void> {
  logger.info(`Updating gitai to ${latestVersion}...`);
  await execa('npm', ['install', '-g', `${pkgName}@${latestVersion}`]);
  logger.success(`Updated to gitai ${latestVersion}. Re-run gitai to use the new version.`);
}

export type UpdateCommandOutcome = 'up-to-date' | 'updated' | 'update-failed' | 'check-failed';

export interface UpdateCommandDeps {
  currentVersion: string;
  fetchVersionInfo: () => Promise<UpdateInfo | undefined>;
  installUpdate: (latestVersion: string) => Promise<void>;
}

export async function runUpdateCommand(deps: UpdateCommandDeps): Promise<UpdateCommandOutcome> {
  logger.info(`📦 Current version: ${deps.currentVersion}`);

  const info = await deps.fetchVersionInfo();
  if (!info) {
    logger.error(
      'Could not check the latest version. Check your network connection and try again.'
    );
    return 'check-failed';
  }

  logger.info(`🌐 Latest published version: ${info.latest}`);

  if (info.type === 'latest') {
    logger.success('You are already using the latest version of gitai.');
    return 'up-to-date';
  }

  try {
    await deps.installUpdate(info.latest);
    return 'updated';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Update failed: ${message}`);
    return 'update-failed';
  }
}
