import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../shared/defaults';
import type { SiteRule } from '../shared/types';
import { matchesSiteRule, resolveEffectiveRule } from './rules';

describe('matchesSiteRule', () => {
  it('matches exact hostnames case-insensitively', () => {
    const rule: SiteRule = {
      id: 'rule-1',
      enabled: true,
      hostnamePattern: 'Example.COM',
      localeProfileId: 'default',
    };

    expect(matchesSiteRule(rule, 'https://example.com/path')).toBe(true);
    expect(matchesSiteRule(rule, 'https://sub.example.com/path')).toBe(false);
  });

  it('matches wildcard subdomains', () => {
    const rule: SiteRule = {
      id: 'rule-2',
      enabled: true,
      hostnamePattern: '*.example.com',
      localeProfileId: 'default',
    };

    expect(matchesSiteRule(rule, 'https://app.example.com')).toBe(true);
    expect(matchesSiteRule(rule, 'https://deep.app.example.com')).toBe(true);
    expect(matchesSiteRule(rule, 'https://example.com')).toBe(false);
  });
});

describe('resolveEffectiveRule', () => {
  it('returns defaults when no site rule matches', () => {
    const result = resolveEffectiveRule(DEFAULT_SETTINGS, 'https://unknown.test');

    expect(result.url).toBe('https://unknown.test');
    expect(result.localeProfile.id).toBe('default');
    expect(result.siteRule).toBeUndefined();
  });

  it('returns the first enabled matching rule', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      siteRules: [
        {
          id: 'disabled',
          enabled: false,
          hostnamePattern: 'example.com',
          localeProfileId: 'default',
        },
        {
          id: 'enabled',
          enabled: true,
          hostnamePattern: 'example.com',
          localeProfileId: 'default',
        },
      ],
    };

    const result = resolveEffectiveRule(settings, 'https://example.com');

    expect(result.siteRule?.id).toBe('enabled');
  });
});
