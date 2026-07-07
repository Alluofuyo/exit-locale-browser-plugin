import type { LocaleProfile } from '../shared/types';

export const LOCALE_SPOOFING_EVENT = '__EXIT_LOCALE_APPLY__';
export const LOCALE_SPOOFING_CLEAR_EVENT = '__EXIT_LOCALE_CLEAR__';
export const LOCALE_SPOOFING_CACHE_KEY = '__exit_locale_spoofing_state__';
const GEOLOCATION_ACCURACY_METERS = 50000;
const REGISTRY_KEY = Symbol.for('exit-locale.locale-spoofing-registry');

export interface LocaleSpoofingGeolocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export interface LocaleSpoofingState {
  languages: string[];
  timezone: string;
  geolocation?: LocaleSpoofingGeolocation;
}

export interface GeolocationPositionLike {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: null;
    altitudeAccuracy: null;
    heading: null;
    speed: null;
  };
  timestamp: number;
}

interface LocaleSpoofingRegistry {
  state?: LocaleSpoofingState;
  navigatorLanguagesPatched?: boolean;
  timezonePatched?: boolean;
  geolocationPatched?: boolean;
  nativeDateTimeFormat?: typeof Intl.DateTimeFormat;
  patchedDateTimeFormat?: typeof Intl.DateTimeFormat;
  watchId: number;
}

type LocaleSpoofingCacheStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getRegistry(): LocaleSpoofingRegistry {
  const globalScope = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: LocaleSpoofingRegistry;
  };

  globalScope[REGISTRY_KEY] ??= {
    watchId: 0,
  };

  return globalScope[REGISTRY_KEY];
}

function hasCoordinate(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createLocaleSpoofingState(profile: LocaleProfile): LocaleSpoofingState {
  const geolocation =
    hasCoordinate(profile.latitude) && hasCoordinate(profile.longitude)
      ? {
          latitude: profile.latitude,
          longitude: profile.longitude,
          accuracyMeters: GEOLOCATION_ACCURACY_METERS,
        }
      : undefined;

  return {
    languages: profile.languages,
    timezone: profile.timezone,
    geolocation,
  };
}

export function createGeolocationPosition(
  geolocation: LocaleSpoofingGeolocation,
  timestamp = Date.now(),
): GeolocationPositionLike {
  return {
    coords: {
      latitude: geolocation.latitude,
      longitude: geolocation.longitude,
      accuracy: geolocation.accuracyMeters,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isLocaleSpoofingState(value: unknown): value is LocaleSpoofingState {
  if (!isRecord(value) || !Array.isArray(value.languages) || typeof value.timezone !== 'string') {
    return false;
  }

  if (!value.languages.every((language) => typeof language === 'string')) {
    return false;
  }

  if (value.geolocation === undefined) {
    return true;
  }

  return (
    isRecord(value.geolocation) &&
    isNumber(value.geolocation.latitude) &&
    isNumber(value.geolocation.longitude) &&
    isNumber(value.geolocation.accuracyMeters)
  );
}

export function serializeLocaleSpoofingState(state: LocaleSpoofingState): string {
  return JSON.stringify(state);
}

export function parseLocaleSpoofingEventDetail(detail: unknown): LocaleSpoofingState | undefined {
  if (typeof detail !== 'string') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(detail) as unknown;
    return isLocaleSpoofingState(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function getSessionStorage(): LocaleSpoofingCacheStorage | undefined {
  try {
    return (globalThis as typeof globalThis & { sessionStorage?: LocaleSpoofingCacheStorage }).sessionStorage;
  } catch {
    return undefined;
  }
}

export function readCachedLocaleSpoofingState(
  storage = getSessionStorage(),
): LocaleSpoofingState | undefined {
  if (!storage) {
    return undefined;
  }

  try {
    const cachedState = storage.getItem(LOCALE_SPOOFING_CACHE_KEY);
    if (!cachedState) {
      return undefined;
    }

    const state = parseLocaleSpoofingEventDetail(cachedState);
    if (!state) {
      storage.removeItem(LOCALE_SPOOFING_CACHE_KEY);
    }

    return state;
  } catch {
    return undefined;
  }
}

export function writeCachedLocaleSpoofingState(
  state: LocaleSpoofingState,
  storage = getSessionStorage(),
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LOCALE_SPOOFING_CACHE_KEY, serializeLocaleSpoofingState(state));
  } catch {
    // Some pages expose sessionStorage but reject writes, for example opaque origins.
  }
}

export function clearCachedLocaleSpoofingState(storage = getSessionStorage()): void {
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(LOCALE_SPOOFING_CACHE_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

export function applyCachedLocaleSpoofing(storage = getSessionStorage()): boolean {
  const state = readCachedLocaleSpoofingState(storage);
  if (!state) {
    return false;
  }

  applyLocaleSpoofing(state);
  return true;
}

function defineGetter<TObject extends object, TValue>(
  object: TObject,
  property: string,
  get: () => TValue,
): void {
  Object.defineProperty(object, property, {
    configurable: true,
    get,
  });
}

function patchNavigatorLanguages(state: LocaleSpoofingState): void {
  const primaryLanguage = state.languages[0];
  if (!primaryLanguage) {
    return;
  }

  const registry = getRegistry();
  if (registry.navigatorLanguagesPatched) {
    return;
  }

  const navigatorPrototype = Navigator.prototype;
  defineGetter(navigatorPrototype, 'language', () => getRegistry().state?.languages[0] ?? primaryLanguage);
  defineGetter(navigatorPrototype, 'languages', () => [...(getRegistry().state?.languages ?? state.languages)]);
  registry.navigatorLanguagesPatched = true;
}

function patchTimezone(state: LocaleSpoofingState): void {
  const registry = getRegistry();
  if (registry.timezonePatched && Intl.DateTimeFormat === registry.patchedDateTimeFormat) {
    return;
  }

  const nativeDateTimeFormat = registry.nativeDateTimeFormat ?? Intl.DateTimeFormat;
  registry.nativeDateTimeFormat = nativeDateTimeFormat;

  const patchedDateTimeFormat = function DateTimeFormat(
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ) {
    const activeState = getRegistry().state ?? state;
    const timezone = activeState.timezone;
    const nextOptions = {
      ...(options ?? {}),
      timeZone: options?.timeZone ?? timezone,
    };
    const formatter = new nativeDateTimeFormat(locales ?? activeState.languages, nextOptions);
    const nativeResolvedOptions = formatter.resolvedOptions.bind(formatter);

    Object.defineProperty(formatter, 'resolvedOptions', {
      configurable: true,
      value: () => ({
        ...nativeResolvedOptions(),
        timeZone: timezone,
      }),
    });

    return formatter;
  } as typeof Intl.DateTimeFormat;

  Object.setPrototypeOf(patchedDateTimeFormat, nativeDateTimeFormat);
  (patchedDateTimeFormat as typeof patchedDateTimeFormat & { prototype: Intl.DateTimeFormat }).prototype =
    nativeDateTimeFormat.prototype;
  Intl.DateTimeFormat = patchedDateTimeFormat;
  registry.timezonePatched = true;
  registry.patchedDateTimeFormat = patchedDateTimeFormat;
}

function patchGeolocation(state: LocaleSpoofingState): void {
  if (!state.geolocation) {
    return;
  }

  const registry = getRegistry();
  if (registry.geolocationPatched) {
    return;
  }

  const geolocation = {
    getCurrentPosition(success: PositionCallback) {
      const activeGeolocation = getRegistry().state?.geolocation ?? state.geolocation;
      if (activeGeolocation) {
        queueMicrotask(() => success(createGeolocationPosition(activeGeolocation) as GeolocationPosition));
      }
    },
    watchPosition(success: PositionCallback) {
      registry.watchId += 1;
      const currentWatchId = registry.watchId;
      const activeGeolocation = getRegistry().state?.geolocation ?? state.geolocation;
      if (activeGeolocation) {
        queueMicrotask(() => success(createGeolocationPosition(activeGeolocation) as GeolocationPosition));
      }
      return currentWatchId;
    },
    clearWatch() {
      return undefined;
    },
  } satisfies Partial<Geolocation>;

  defineGetter(Navigator.prototype, 'geolocation', () => geolocation);
  registry.geolocationPatched = true;
}

export function applyLocaleSpoofing(state: LocaleSpoofingState): void {
  if (!state.timezone && state.languages.length === 0 && !state.geolocation) {
    return;
  }

  getRegistry().state = state;
  patchNavigatorLanguages(state);
  patchTimezone(state);
  patchGeolocation(state);
}
