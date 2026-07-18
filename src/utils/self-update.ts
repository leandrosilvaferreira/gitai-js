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
      const lastCheck = notifier.config?.get<number>('lastUpdateCheck') ?? 0;
      if (Date.now() - lastCheck < ONE_DAY_MS) {
        return undefined;
      }

      try {
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
    installUpdate: async (info) => {
      logger.info(`Updating gitai to ${info.latest}...`);
      await execa('npm', ['install', '-g', `${pkgName}@${info.latest}`]);
      logger.success(`Updated to gitai ${info.latest}. Re-run gitai to use the new version.`);
    },
  };
}
