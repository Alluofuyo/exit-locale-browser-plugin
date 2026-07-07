import { describe, expect, it } from 'vitest';
import type { ExtensionSettings } from '../shared/types';
import {
  upsertDefaultLocaleProfile,
  upsertSiteRule,
  parseLanguagesInput,
  parseOptionalNumberInput,
} from './settings-editor';

const baseSettings: ExtensionSettings = {
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

describe('parseLanguagesInput', () => {
  it('normalizes comma and whitespace separated language tags', () => {
    expect(parseLanguagesInput('ja-JP, ja  en-US')).toEqual(['ja-JP', 'ja', 'en-US']);
  });

  it('falls back to en-US when input is empty', () => {
    expect(parseLanguagesInput('  , ')).toEqual(['en-US']);
  });
});

describe('parseOptionalNumberInput', () => {
  it('returns undefined for blank input', () => {
    expect(parseOptionalNumberInput('')).toBeUndefined();
  });

  it('returns undefined for invalid numbers', () => {
    expect(parseOptionalNumberInput('not-a-number')).toBeUndefined();
  });

  it('parses finite numbers', () => {
    expect(parseOptionalNumberInput('35.6895')).toBe(35.6895);
  });
});

describe('upsertDefaultLocaleProfile', () => {
  it('updates the active locale profile while preserving other settings', () => {
    expect(
      upsertDefaultLocaleProfile(baseSettings, {
        name: 'Tokyo',
        languages: ['ja-JP', 'ja'],
        timezone: 'Asia/Tokyo',
        latitude: 35.6895,
        longitude: 139.6917,
      }),
    ).toEqual({
      ...baseSettings,
      localeProfiles: [
        {
          id: 'default',
          name: 'Tokyo',
          languages: ['ja-JP', 'ja'],
          timezone: 'Asia/Tokyo',
          latitude: 35.6895,
          longitude: 139.6917,
        },
      ],
    });
  });

  it('creates the active locale profile when it is missing', () => {
    const settings = {
      ...baseSettings,
      defaultLocaleProfileId: 'custom',
      localeProfiles: [],
    };

    expect(
      upsertDefaultLocaleProfile(settings, {
        name: 'Custom',
        languages: ['fr-FR', 'fr'],
        timezone: 'Europe/Paris',
      }).localeProfiles,
    ).toEqual([
      {
        id: 'custom',
        name: 'Custom',
        languages: ['fr-FR', 'fr'],
        timezone: 'Europe/Paris',
      },
    ]);
  });
});

describe('upsertSiteRule', () => {
  it('adds an enabled site rule for a hostname pattern', () => {
    expect(upsertSiteRule(baseSettings, 'example.com').siteRules).toEqual([
      {
        id: 'site-example-com',
        enabled: true,
        hostnamePattern: 'example.com',
        localeProfileId: 'default',
      },
    ]);
  });

  it('updates an existing site rule instead of duplicating it', () => {
    const settings = upsertSiteRule(baseSettings, 'example.com');

    expect(upsertSiteRule(settings, 'example.com').siteRules).toHaveLength(1);
  });
});
