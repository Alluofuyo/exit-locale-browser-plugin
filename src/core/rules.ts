import type { EffectiveRule, ExtensionSettings, LocaleProfile, ProxyProfile, SiteRule } from '../shared/types';

function getHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

export function matchesSiteRule(rule: SiteRule, url: string): boolean {
  if (!rule.enabled) {
    return false;
  }

  const hostname = getHostname(url);
  if (!hostname) {
    return false;
  }

  const pattern = rule.hostnamePattern.trim().toLowerCase();
  if (pattern === '*') {
    return true;
  }

  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return hostname.endsWith(`.${suffix}`);
  }

  return hostname === pattern;
}

function findProxyProfile(settings: ExtensionSettings, profileId: string): ProxyProfile | undefined {
  return (
    settings.proxyProfiles.find((profile) => profile.id === profileId) ??
    settings.proxyProfiles.find((profile) => profile.id === settings.defaultProxyProfileId) ??
    settings.proxyProfiles[0]
  );
}

function findLocaleProfile(settings: ExtensionSettings, profileId: string): LocaleProfile | undefined {
  return (
    settings.localeProfiles.find((profile) => profile.id === profileId) ??
    settings.localeProfiles.find((profile) => profile.id === settings.defaultLocaleProfileId) ??
    settings.localeProfiles[0]
  );
}

export function resolveEffectiveRule(settings: ExtensionSettings, url: string): EffectiveRule {
  const siteRule = settings.siteRules.find((rule) => matchesSiteRule(rule, url));
  const proxyProfileId = siteRule?.proxyProfileId ?? settings.defaultProxyProfileId;
  const localeProfileId = siteRule?.localeProfileId ?? settings.defaultLocaleProfileId;
  const proxyProfile = findProxyProfile(settings, proxyProfileId);
  const localeProfile = findLocaleProfile(settings, localeProfileId);

  if (!proxyProfile || !localeProfile) {
    throw new Error('Settings must contain at least one proxy profile and one locale profile.');
  }

  return {
    url,
    enabled: settings.enabled,
    proxyProfile,
    localeProfile,
    siteRule,
  };
}
