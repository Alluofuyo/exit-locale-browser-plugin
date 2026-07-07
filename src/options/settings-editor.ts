import type { ExtensionSettings, LocaleProfile, SiteRule } from '../shared/types';

interface LocaleProfileInput {
  name: string;
  languages: string[];
  timezone: string;
  latitude?: number;
  longitude?: number;
}

export function parseLanguagesInput(value: string): string[] {
  const languages = value
    .split(/[\s,]+/)
    .map((language) => language.trim())
    .filter(Boolean);

  return languages.length > 0 ? languages : ['en-US'];
}

export function parseOptionalNumberInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const number = Number(trimmed);
  return Number.isFinite(number) ? number : undefined;
}

export function upsertDefaultLocaleProfile(
  settings: ExtensionSettings,
  input: LocaleProfileInput,
): ExtensionSettings {
  const profileId = settings.defaultLocaleProfileId || settings.localeProfiles[0]?.id || 'default';
  const existingProfile = settings.localeProfiles.find((profile) => profile.id === profileId);
  const nextProfile: LocaleProfile = {
    ...(existingProfile ?? { id: profileId }),
    name: input.name.trim() || existingProfile?.name || 'Custom locale',
    languages: input.languages,
    timezone: input.timezone.trim() || existingProfile?.timezone || 'UTC',
    latitude: input.latitude,
    longitude: input.longitude,
  };

  const hasExistingProfile = settings.localeProfiles.some((profile) => profile.id === profileId);
  return {
    ...settings,
    defaultLocaleProfileId: profileId,
    localeProfiles: hasExistingProfile
      ? settings.localeProfiles.map((profile) => (profile.id === profileId ? nextProfile : profile))
      : [...settings.localeProfiles, nextProfile],
  };
}

function createSiteRuleId(hostnamePattern: string): string {
  const slug = hostnamePattern.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `site-${slug || 'rule'}`;
}

export function upsertSiteRule(settings: ExtensionSettings, hostnamePattern: string): ExtensionSettings {
  const pattern = hostnamePattern.trim().toLowerCase();
  if (!pattern) {
    return settings;
  }

  const nextRule: SiteRule = {
    id: settings.siteRules.find((rule) => rule.hostnamePattern === pattern)?.id ?? createSiteRuleId(pattern),
    enabled: true,
    hostnamePattern: pattern,
    localeProfileId: settings.defaultLocaleProfileId,
  };

  const hasExistingRule = settings.siteRules.some((rule) => rule.hostnamePattern === pattern);
  return {
    ...settings,
    siteRules: hasExistingRule
      ? settings.siteRules.map((rule) => (rule.hostnamePattern === pattern ? nextRule : rule))
      : [...settings.siteRules, nextRule],
  };
}

export function removeSiteRule(settings: ExtensionSettings, ruleId: string): ExtensionSettings {
  return {
    ...settings,
    siteRules: settings.siteRules.filter((rule) => rule.id !== ruleId),
  };
}
