import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { UpdateInfo } from 'update-notifier';

import {
  checkForSelfUpdate,
  runUpdateCommand,
  type SelfUpdateDeps,
  type UpdateCommandDeps,
} from './self-update.js';

const SAMPLE_UPDATE: UpdateInfo = {
  latest: '1.3.0',
  current: '1.2.0',
  type: 'minor',
  name: '@notyped/gitai',
};

test('checkForSelfUpdate returns no-update and never prompts or installs when fetchLatest finds nothing', async () => {
  let confirmCalled = false;
  let installCalled = false;
  const deps: SelfUpdateDeps = {
    fetchLatest: async () => undefined,
    confirmInstall: async () => {
      confirmCalled = true;
      return true;
    },
    installUpdate: async () => {
      installCalled = true;
    },
  };

  const result = await checkForSelfUpdate(deps);

  assert.equal(result, 'no-update');
  assert.equal(confirmCalled, false);
  assert.equal(installCalled, false);
});

test('checkForSelfUpdate returns declined and never installs when the user declines', async () => {
  let installCalled = false;
  const deps: SelfUpdateDeps = {
    fetchLatest: async () => SAMPLE_UPDATE,
    confirmInstall: async () => false,
    installUpdate: async () => {
      installCalled = true;
    },
  };

  const result = await checkForSelfUpdate(deps);

  assert.equal(result, 'declined');
  assert.equal(installCalled, false);
});

test('checkForSelfUpdate returns installed and calls installUpdate with the fetched info when confirmed', async () => {
  let receivedInfo: UpdateInfo | undefined;
  const deps: SelfUpdateDeps = {
    fetchLatest: async () => SAMPLE_UPDATE,
    confirmInstall: async () => true,
    installUpdate: async (info) => {
      receivedInfo = info;
    },
  };

  const result = await checkForSelfUpdate(deps);

  assert.equal(result, 'installed');
  assert.deepEqual(receivedInfo, SAMPLE_UPDATE);
});

test('checkForSelfUpdate returns install-failed and does not throw when installUpdate rejects', async () => {
  const deps: SelfUpdateDeps = {
    fetchLatest: async () => SAMPLE_UPDATE,
    confirmInstall: async () => true,
    installUpdate: async () => {
      throw new Error('npm install exploded');
    },
  };

  const result = await checkForSelfUpdate(deps);

  assert.equal(result, 'install-failed');
});

const SAMPLE_LATEST: UpdateInfo = {
  latest: '1.4.0',
  current: '1.4.0',
  type: 'latest',
  name: '@notyped/gitai',
};

test('runUpdateCommand returns check-failed and never calls installUpdate when fetchVersionInfo finds nothing', async () => {
  let installCalled = false;
  const deps: UpdateCommandDeps = {
    currentVersion: '1.4.0',
    fetchVersionInfo: async () => undefined,
    installUpdate: async () => {
      installCalled = true;
    },
  };

  const result = await runUpdateCommand(deps);

  assert.equal(result, 'check-failed');
  assert.equal(installCalled, false);
});

test('runUpdateCommand returns up-to-date and never calls installUpdate when already on the latest version', async () => {
  let installCalled = false;
  const deps: UpdateCommandDeps = {
    currentVersion: '1.4.0',
    fetchVersionInfo: async () => SAMPLE_LATEST,
    installUpdate: async () => {
      installCalled = true;
    },
  };

  const result = await runUpdateCommand(deps);

  assert.equal(result, 'up-to-date');
  assert.equal(installCalled, false);
});

test('runUpdateCommand returns updated and calls installUpdate with the latest version when a newer version exists', async () => {
  let receivedVersion: string | undefined;
  const deps: UpdateCommandDeps = {
    currentVersion: '1.2.0',
    fetchVersionInfo: async () => SAMPLE_UPDATE,
    installUpdate: async (latestVersion) => {
      receivedVersion = latestVersion;
    },
  };

  const result = await runUpdateCommand(deps);

  assert.equal(result, 'updated');
  assert.equal(receivedVersion, SAMPLE_UPDATE.latest);
});

test('runUpdateCommand returns update-failed and does not throw when installUpdate rejects', async () => {
  const deps: UpdateCommandDeps = {
    currentVersion: '1.2.0',
    fetchVersionInfo: async () => SAMPLE_UPDATE,
    installUpdate: async () => {
      throw new Error('npm install exploded');
    },
  };

  const result = await runUpdateCommand(deps);

  assert.equal(result, 'update-failed');
});
