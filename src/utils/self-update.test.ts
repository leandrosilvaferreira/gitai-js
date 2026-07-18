import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { UpdateInfo } from 'update-notifier';

import { checkForSelfUpdate, type SelfUpdateDeps } from './self-update.js';

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
