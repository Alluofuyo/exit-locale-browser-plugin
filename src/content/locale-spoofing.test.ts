import { describe, expect, it } from 'vitest';
import type { LocaleProfile } from '../shared/types';
import {
  applyLocaleSpoofing,
  applyCachedLocaleSpoofing,
  clearCachedLocaleSpoofingState,
  createGeolocationPosition,
  createLocaleSpoofingState,
  isLocaleSpoofingState,
  LOCALE_SPOOFING_CACHE_KEY,
  parseLocaleSpoofingEventDetail,
  readCachedLocaleSpoofingState,
  serializeLocaleSpoofingState,
  writeCachedLocaleSpoofingState,
} from './locale-spoofing';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

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

describe('cached locale spoofing state', () => {
  it('stores and applies a cached spoofing state synchronously', () => {
    const storage = new MemoryStorage();
    const nativeDateTimeFormat = Intl.DateTimeFormat;
    const state = {
      languages: ['ja-JP', 'ja'],
      timezone: 'Asia/Tokyo',
      geolocation: {
        latitude: 35.6895,
        longitude: 139.6917,
        accuracyMeters: 50000,
      },
    };

    writeCachedLocaleSpoofingState(state, storage);

    expect(readCachedLocaleSpoofingState(storage)).toEqual(state);
    expect(applyCachedLocaleSpoofing(storage)).toBe(true);
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Asia/Tokyo');

    clearCachedLocaleSpoofingState(storage);
    expect(storage.getItem(LOCALE_SPOOFING_CACHE_KEY)).toBeNull();

    Intl.DateTimeFormat = nativeDateTimeFormat;
  });

  it('removes invalid cached payloads', () => {
    const storage = new MemoryStorage();

    storage.setItem(LOCALE_SPOOFING_CACHE_KEY, 'not-json');

    expect(readCachedLocaleSpoofingState(storage)).toBeUndefined();
    expect(storage.getItem(LOCALE_SPOOFING_CACHE_KEY)).toBeNull();
  });
});
