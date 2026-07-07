import type { ExtensionSettings, IpCheckResult } from './types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  schemaVersion: 1,
  enabled: true,
  defaultLocaleProfileId: 'default',
  localeProfiles: [
    {
      id: 'default',
      name: 'Browser default',
      languages: ['en-US', 'en'],
      timezone: 'UTC',
    },
  ],
  siteRules: [],
  ipCheck: {
    providerId: 'ipapi',
    timeoutMs: 5000,
    cacheTtlMs: 60000,
    autoRefreshOnPopupOpen: true,
  },
};

export const EMPTY_IP_CHECK_RESULT: IpCheckResult = {
  status: 'failure',
  providerId: DEFAULT_SETTINGS.ipCheck.providerId,
  checkedAt: new Date(0).toISOString(),
  error: {
    code: 'network_error',
    message: 'No exit IP check has been completed.',
  },
};
