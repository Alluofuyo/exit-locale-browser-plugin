import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../shared/defaults';
import type { IpCheckResult } from '../shared/types';
import {
  applyLocaleRecommendationToSettings,
  buildLocaleRecommendation,
  createLocaleProfileFromRecommendation,
} from './locale-recommendation';

describe('buildLocaleRecommendation', () => {
  it('recommends language, timezone, and geolocation from a successful exit IP result', () => {
    const result: IpCheckResult = {
      status: 'success',
      providerId: 'ipapi',
      checkedAt: '2026-07-07T00:00:00.000Z',
      ip: '8.8.8.8',
      country: 'United States',
      countryCode: 'US',
      region: 'California',
      city: 'Mountain View',
      timezone: 'America/Los_Angeles',
      latitude: 37.386,
      longitude: -122.0838,
      languages: ['en-US', 'es-US', 'haw', 'fr'],
    };

    const recommendation = buildLocaleRecommendation(result);

    expect(recommendation).toEqual({
      status: 'available',
      confidence: 'high',
      source: {
        providerId: 'ipapi',
        ip: '8.8.8.8',
        country: 'United States',
        countryCode: 'US',
      },
      languages: ['en-US', 'es-US', 'haw', 'fr'],
      timezone: 'America/Los_Angeles',
      geolocation: {
        latitude: 37.386,
        longitude: -122.0838,
        accuracyMeters: 50000,
        label: 'Mountain View, California, United States',
      },
    });
  });

  it('falls back to country language defaults when provider languages are missing', () => {
    const result: IpCheckResult = {
      status: 'success',
      providerId: 'ipapi',
      checkedAt: '2026-07-07T00:00:00.000Z',
      ip: '203.0.113.10',
      country: 'Japan',
      countryCode: 'JP',
      timezone: 'Asia/Tokyo',
    };

    const recommendation = buildLocaleRecommendation(result);

    expect(recommendation.status).toBe('available');
    expect(recommendation.confidence).toBe('medium');
    expect(recommendation.languages).toEqual(['ja-JP', 'ja']);
    expect(recommendation.timezone).toBe('Asia/Tokyo');
    expect(recommendation.geolocation).toBeUndefined();
  });

  it('returns unavailable for failed exit IP results', () => {
    const result: IpCheckResult = {
      status: 'failure',
      providerId: 'ipapi',
      checkedAt: '2026-07-07T00:00:00.000Z',
      error: {
        code: 'network_error',
        message: 'Network down',
      },
    };

    expect(buildLocaleRecommendation(result)).toEqual({
      status: 'unavailable',
      confidence: 'low',
      source: {
        providerId: 'ipapi',
      },
      languages: [],
      reason: 'A successful exit IP check is required before recommending locale spoofing.',
    });
  });
});

describe('createLocaleProfileFromRecommendation', () => {
  it('creates a locale profile from an available recommendation', () => {
    const profile = createLocaleProfileFromRecommendation({
      status: 'available',
      confidence: 'high',
      source: {
        providerId: 'ipapi',
        ip: '8.8.8.8',
        country: 'United States',
        countryCode: 'US',
      },
      languages: ['en-US', 'en'],
      timezone: 'America/Los_Angeles',
      geolocation: {
        latitude: 37.386,
        longitude: -122.0838,
        accuracyMeters: 50000,
        label: 'Mountain View, California, United States',
      },
    });

    expect(profile).toEqual({
      id: 'recommended-from-exit-ip',
      name: 'Recommended from exit IP',
      languages: ['en-US', 'en'],
      timezone: 'America/Los_Angeles',
      latitude: 37.386,
      longitude: -122.0838,
    });
  });

  it('returns undefined for unavailable recommendations', () => {
    expect(
      createLocaleProfileFromRecommendation({
        status: 'unavailable',
        confidence: 'low',
        source: {
          providerId: 'ipapi',
        },
        languages: [],
        reason: 'Missing data',
      }),
    ).toBeUndefined();
  });
});

describe('applyLocaleRecommendationToSettings', () => {
  it('stores the recommended profile and makes it the default locale profile', () => {
    const settings = applyLocaleRecommendationToSettings(DEFAULT_SETTINGS, {
      status: 'available',
      confidence: 'high',
      source: {
        providerId: 'ipapi',
        ip: '8.8.8.8',
        country: 'United States',
        countryCode: 'US',
      },
      languages: ['en-US', 'en'],
      timezone: 'America/Los_Angeles',
      geolocation: {
        latitude: 37.386,
        longitude: -122.0838,
        accuracyMeters: 50000,
        label: 'Mountain View, California, United States',
      },
    });

    expect(settings.defaultLocaleProfileId).toBe('recommended-from-exit-ip');
    expect(settings.localeProfiles).toContainEqual({
      id: 'recommended-from-exit-ip',
      name: 'Recommended from exit IP',
      languages: ['en-US', 'en'],
      timezone: 'America/Los_Angeles',
      latitude: 37.386,
      longitude: -122.0838,
    });
  });

  it('returns the original settings for unavailable recommendations', () => {
    const settings = applyLocaleRecommendationToSettings(DEFAULT_SETTINGS, {
      status: 'unavailable',
      confidence: 'low',
      source: {
        providerId: 'ipapi',
      },
      languages: [],
      reason: 'Missing data',
    });

    expect(settings).toBe(DEFAULT_SETTINGS);
  });
});
