import type { LocaleProfile } from '../shared/types';

export const LOCALE_SPOOFING_EVENT = '__EXIT_LOCALE_APPLY__';
const GEOLOCATION_ACCURACY_METERS = 50000;

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

  const navigatorPrototype = Navigator.prototype;
  defineGetter(navigatorPrototype, 'language', () => primaryLanguage);
  defineGetter(navigatorPrototype, 'languages', () => [...state.languages]);
}

function patchTimezone(state: LocaleSpoofingState): void {
  const nativeDateTimeFormat = Intl.DateTimeFormat;
  const timezone = state.timezone;

  const patchedDateTimeFormat = function DateTimeFormat(
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ) {
    const nextOptions = {
      ...(options ?? {}),
      timeZone: options?.timeZone ?? timezone,
    };
    const formatter = new nativeDateTimeFormat(locales ?? state.languages, nextOptions);
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
}

function patchGeolocation(state: LocaleSpoofingState): void {
  if (!state.geolocation) {
    return;
  }

  let watchId = 0;
  const geolocation = {
    getCurrentPosition(success: PositionCallback) {
      queueMicrotask(() => success(createGeolocationPosition(state.geolocation!) as GeolocationPosition));
    },
    watchPosition(success: PositionCallback) {
      watchId += 1;
      const currentWatchId = watchId;
      queueMicrotask(() => success(createGeolocationPosition(state.geolocation!) as GeolocationPosition));
      return currentWatchId;
    },
    clearWatch() {
      return undefined;
    },
  } satisfies Partial<Geolocation>;

  defineGetter(Navigator.prototype, 'geolocation', () => geolocation);
}

export function applyLocaleSpoofing(state: LocaleSpoofingState): void {
  if (!state.timezone && state.languages.length === 0 && !state.geolocation) {
    return;
  }

  patchNavigatorLanguages(state);
  patchTimezone(state);
  patchGeolocation(state);
}
