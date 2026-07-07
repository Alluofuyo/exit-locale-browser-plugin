import { describe, expect, it } from 'vitest';
import type { LocaleProfile } from '../shared/types';
import {
  applyLocaleSpoofing,
  createGeolocationPosition,
  createLocaleSpoofingState,
  isLocaleSpoofingState,
  parseLocaleSpoofingEventDetail,
  serializeLocaleSpoofingState,
} from './locale-spoofing';

describe('createLocaleSpoofingState', () => {
  it('creates spoofing state from a locale profile', () => {
    const profile: LocaleProfile = {
      id: 'recommended-from-exit-ip',
      name: 'Recommended from exit IP',
      languages: ['en-US', 'en'],
      timezone: 'America/Los_Angeles',
      latitude: 37.386,
      longitude: -122.0838,
    };

    expect(createLocaleSpoofingState(profile)).toEqual({
      languages: ['en-US', 'en'],
      timezone: 'America/Los_Angeles',
      geolocation: {
        latitude: 37.386,
        longitude: -122.0838,
        accuracyMeters: 50000,
      },
    });
  });

  it('omits geolocation when coordinates are missing', () => {
    const profile: LocaleProfile = {
      id: 'default',
      name: 'Browser default',
      languages: ['ja-JP', 'ja'],
      timezone: 'Asia/Tokyo',
    };

    expect(createLocaleSpoofingState(profile)).toEqual({
      languages: ['ja-JP', 'ja'],
      timezone: 'Asia/Tokyo',
    });
  });
});

describe('createGeolocationPosition', () => {
  it('creates a browser-like geolocation position', () => {
    expect(
      createGeolocationPosition(
        {
          latitude: 37.386,
          longitude: -122.0838,
          accuracyMeters: 50000,
        },
        1783440000000,
      ),
    ).toEqual({
      coords: {
        latitude: 37.386,
        longitude: -122.0838,
        accuracy: 50000,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: 1783440000000,
    });
  });
});

describe('isLocaleSpoofingState', () => {
  it('accepts valid spoofing state', () => {
    expect(
      isLocaleSpoofingState({
        languages: ['en-US', 'en'],
        timezone: 'America/Los_Angeles',
        geolocation: {
          latitude: 37.386,
          longitude: -122.0838,
          accuracyMeters: 50000,
        },
      }),
    ).toBe(true);
  });

  it('rejects invalid spoofing state', () => {
    expect(isLocaleSpoofingState(null)).toBe(false);
    expect(isLocaleSpoofingState({ languages: 'en-US', timezone: 'UTC' })).toBe(false);
    expect(isLocaleSpoofingState({ languages: ['en-US'], timezone: 8 })).toBe(false);
  });
});

describe('locale spoofing event payloads', () => {
  it('serializes and parses spoofing state', () => {
    const state = {
      languages: ['en-US', 'en'],
      timezone: 'America/Los_Angeles',
      geolocation: {
        latitude: 37.386,
        longitude: -122.0838,
        accuracyMeters: 50000,
      },
    };

    expect(parseLocaleSpoofingEventDetail(serializeLocaleSpoofingState(state))).toEqual(state);
  });

  it('returns undefined for invalid payloads', () => {
    expect(parseLocaleSpoofingEventDetail('not-json')).toBeUndefined();
    expect(parseLocaleSpoofingEventDetail(JSON.stringify({ languages: 'en-US', timezone: 'UTC' }))).toBeUndefined();
  });
});

describe('applyLocaleSpoofing', () => {
  it('does not wrap Intl.DateTimeFormat more than once for identical state', () => {
    const nativeDateTimeFormat = Intl.DateTimeFormat;

    applyLocaleSpoofing({
      languages: ['en-US', 'en'],
      timezone: 'America/Los_Angeles',
    });

    const patchedDateTimeFormat = Intl.DateTimeFormat;

    applyLocaleSpoofing({
      languages: ['en-US', 'en'],
      timezone: 'America/Los_Angeles',
    });

    expect(Intl.DateTimeFormat).toBe(patchedDateTimeFormat);
    expect(Intl.DateTimeFormat).not.toBe(nativeDateTimeFormat);
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');

    Intl.DateTimeFormat = nativeDateTimeFormat;
  });
});
