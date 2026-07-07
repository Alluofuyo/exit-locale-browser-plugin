import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_SETTINGS } from '../shared/defaults';
import { loadLastIpCheck, loadSettings, saveLastIpCheck, saveSettings } from './settings';

describe('settings storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns default settings when storage is empty', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('saves and loads settings', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      enabled: false,
    };

    await saveSettings(settings);

    await expect(loadSettings()).resolves.toEqual(settings);
  });

  it('falls back to defaults when settings are invalid', async () => {
    await browser.storage.local.set({
      extensionSettings: {
        schemaVersion: 99,
        enabled: 'yes',
      },
    });

    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('saves and loads the last IP check result', async () => {
    const result = {
      status: 'success' as const,
      providerId: 'ipapi',
      checkedAt: '2026-07-07T00:00:00.000Z',
      ip: '203.0.113.10',
      country: 'Exampleland',
    };

    await saveLastIpCheck(result);

    await expect(loadLastIpCheck()).resolves.toEqual(result);
  });
});
