import { DEFAULT_SETTINGS, EMPTY_IP_CHECK_RESULT } from '../shared/defaults';
import { SETTINGS_KEY } from '../shared/storage-keys';
import type { ExtensionSettings, IpCheckResult } from '../shared/types';

const LAST_IP_CHECK_KEY = 'lastIpCheck';

export { SETTINGS_KEY };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isExtensionSettings(value: unknown): value is ExtensionSettings {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    typeof value.enabled === 'boolean' &&
    typeof value.defaultLocaleProfileId === 'string' &&
    Array.isArray(value.localeProfiles) &&
    Array.isArray(value.siteRules) &&
    isObject(value.ipCheck)
  );
}

export function isIpCheckResult(value: unknown): value is IpCheckResult {
  if (!isObject(value)) {
    return false;
  }

  return (
    (value.status === 'success' || value.status === 'failure') &&
    typeof value.providerId === 'string' &&
    typeof value.checkedAt === 'string'
  );
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const values = await browser.storage.local.get(SETTINGS_KEY);
  const value = values[SETTINGS_KEY];
  return isExtensionSettings(value) ? value : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await browser.storage.local.set({
    [SETTINGS_KEY]: settings,
  });
}

export async function loadLastIpCheck(): Promise<IpCheckResult> {
  const values = await browser.storage.local.get(LAST_IP_CHECK_KEY);
  const value = values[LAST_IP_CHECK_KEY];
  return isIpCheckResult(value) ? value : EMPTY_IP_CHECK_RESULT;
}

export async function saveLastIpCheck(result: IpCheckResult): Promise<void> {
  await browser.storage.local.set({
    [LAST_IP_CHECK_KEY]: result,
  });
}
