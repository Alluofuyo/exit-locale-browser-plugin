import type { ExtensionSettings, IpCheckResult, LocaleProfile, LocaleRecommendation } from '../shared/types';

const RECOMMENDED_PROFILE_ID = 'recommended-from-exit-ip';
const GEOLOCATION_ACCURACY_METERS = 50000;

const COUNTRY_LANGUAGE_FALLBACKS: Record<string, string[]> = {
  AU: ['en-AU', 'en'],
  BR: ['pt-BR', 'pt'],
  CA: ['en-CA', 'en', 'fr-CA', 'fr'],
  CN: ['zh-CN', 'zh'],
  DE: ['de-DE', 'de'],
  ES: ['es-ES', 'es'],
  FR: ['fr-FR', 'fr'],
  GB: ['en-GB', 'en'],
  HK: ['zh-HK', 'zh', 'en-HK', 'en'],
  IN: ['hi-IN', 'hi', 'en-IN', 'en'],
  IT: ['it-IT', 'it'],
  JP: ['ja-JP', 'ja'],
  KR: ['ko-KR', 'ko'],
  MX: ['es-MX', 'es'],
  NL: ['nl-NL', 'nl'],
  RU: ['ru-RU', 'ru'],
  SG: ['en-SG', 'en', 'zh-SG', 'zh'],
  TW: ['zh-TW', 'zh'],
  US: ['en-US', 'en'],
};

function normalizeLanguage(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const [language, region] = trimmed.split('-');
  if (!language) {
    return undefined;
  }

  if (!region) {
    return language.toLowerCase();
  }

  return `${language.toLowerCase()}-${region.toUpperCase()}`;
}

function uniqueLanguages(values: string[]): string[] {
  const languages = new Set<string>();

  for (const value of values) {
    const normalized = normalizeLanguage(value);
    if (normalized) {
      languages.add(normalized);
    }
  }

  return [...languages];
}

function getRecommendedLanguages(result: IpCheckResult): string[] {
  const providerLanguages = uniqueLanguages(result.languages ?? []);
  if (providerLanguages.length > 0) {
    return providerLanguages;
  }

  const countryCode = result.countryCode?.toUpperCase();
  return countryCode ? COUNTRY_LANGUAGE_FALLBACKS[countryCode] ?? [] : [];
}

function getLocationLabel(result: IpCheckResult): string {
  return [result.city, result.region, result.country].filter(Boolean).join(', ') || 'Exit IP location';
}

function hasUsableCoordinate(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getConfidence(recommendation: Pick<LocaleRecommendation, 'languages' | 'timezone' | 'geolocation'>) {
  const hasLanguages = recommendation.languages.length > 0;
  const hasTimezone = Boolean(recommendation.timezone);
  const hasGeolocation = Boolean(recommendation.geolocation);

  if (hasLanguages && hasTimezone && hasGeolocation) {
    return 'high';
  }

  if ((hasLanguages && hasTimezone) || (hasTimezone && hasGeolocation) || (hasLanguages && hasGeolocation)) {
    return 'medium';
  }

  return 'low';
}

export function buildLocaleRecommendation(result: IpCheckResult): LocaleRecommendation {
  const source = {
    providerId: result.providerId,
    ip: result.ip,
    country: result.country,
    countryCode: result.countryCode,
  };

  if (result.status !== 'success') {
    return {
      status: 'unavailable',
      confidence: 'low',
      source,
      languages: [],
      reason: 'A successful exit IP check is required before recommending locale spoofing.',
    };
  }

  const languages = getRecommendedLanguages(result);
  const geolocation =
    hasUsableCoordinate(result.latitude) && hasUsableCoordinate(result.longitude)
      ? {
          latitude: result.latitude,
          longitude: result.longitude,
          accuracyMeters: GEOLOCATION_ACCURACY_METERS,
          label: getLocationLabel(result),
        }
      : undefined;

  const recommendation = {
    status: 'available' as const,
    source,
    languages,
    timezone: result.timezone,
    geolocation,
  };
  const confidence = getConfidence(recommendation);

  if (confidence === 'low' && !result.timezone && languages.length === 0 && !geolocation) {
    return {
      status: 'unavailable',
      confidence,
      source,
      languages: [],
      reason: 'The exit IP result did not contain language, timezone, or geolocation fields.',
    };
  }

  return {
    ...recommendation,
    confidence,
  };
}

export function createLocaleProfileFromRecommendation(
  recommendation: LocaleRecommendation,
): LocaleProfile | undefined {
  if (recommendation.status !== 'available') {
    return undefined;
  }

  return {
    id: RECOMMENDED_PROFILE_ID,
    name: 'Recommended from exit IP',
    languages: recommendation.languages,
    timezone: recommendation.timezone ?? 'UTC',
    latitude: recommendation.geolocation?.latitude,
    longitude: recommendation.geolocation?.longitude,
  };
}

export function applyLocaleRecommendationToSettings(
  settings: ExtensionSettings,
  recommendation: LocaleRecommendation,
): ExtensionSettings {
  const profile = createLocaleProfileFromRecommendation(recommendation);
  if (!profile) {
    return settings;
  }

  return {
    ...settings,
    defaultLocaleProfileId: profile.id,
    localeProfiles: [
      ...settings.localeProfiles.filter((existingProfile) => existingProfile.id !== profile.id),
      profile,
    ],
  };
}
