import type { IpCheckResult } from '../shared/types';

export interface IpCheckProvider {
  id: string;
  checkCurrentExit(signal: AbortSignal): Promise<IpCheckResult>;
}

interface IpApiResponse {
  ip?: string;
  city?: string;
  region?: string;
  country_name?: string;
  country_code?: string;
  org?: string;
  asn?: string;
  timezone?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  languages?: string | null;
  error?: boolean;
  reason?: string;
}

interface IpWhoIsResponse {
  success?: boolean;
  message?: string;
  ip?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  connection?: {
    asn?: number | string | null;
    isp?: string;
    org?: string;
  };
  timezone?: {
    id?: string;
  };
}

function toNumber(value: number | string | null | undefined): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function parseLanguages(value: string | null | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const languages = value
    .split(',')
    .map((language) => language.trim())
    .filter(Boolean);

  return languages.length > 0 ? languages : undefined;
}

function normalizeIpApiResponse(data: IpApiResponse): IpCheckResult {
  if (data.error || !data.ip) {
    return {
      status: 'failure',
      providerId: 'ipapi',
      checkedAt: new Date().toISOString(),
      error: {
        code: data.error ? 'rate_limited' : 'invalid_response',
        message: data.reason ?? 'IP provider returned an invalid response.',
      },
    };
  }

  return {
    status: 'success',
    providerId: 'ipapi',
    checkedAt: new Date().toISOString(),
    ip: data.ip,
    country: data.country_name,
    countryCode: data.country_code,
    region: data.region,
    city: data.city,
    isp: data.org,
    asn: data.asn,
    timezone: data.timezone,
    latitude: toNumber(data.latitude),
    longitude: toNumber(data.longitude),
    languages: parseLanguages(data.languages),
  };
}

function normalizeIpWhoIsResponse(data: IpWhoIsResponse): IpCheckResult {
  if (data.success === false || !data.ip) {
    return {
      status: 'failure',
      providerId: 'ipwhois',
      checkedAt: new Date().toISOString(),
      error: {
        code: 'invalid_response',
        message: data.message ?? 'Fallback IP provider returned an invalid response.',
      },
    };
  }

  const asn = data.connection?.asn;
  return {
    status: 'success',
    providerId: 'ipwhois',
    checkedAt: new Date().toISOString(),
    ip: data.ip,
    country: data.country,
    countryCode: data.country_code,
    region: data.region,
    city: data.city,
    isp: data.connection?.isp ?? data.connection?.org,
    asn: asn == null ? undefined : String(asn),
    timezone: data.timezone?.id,
    latitude: toNumber(data.latitude),
    longitude: toNumber(data.longitude),
  };
}

function createHttpFailure(providerId: string, status: number): IpCheckResult {
  return {
    status: 'failure',
    providerId,
    checkedAt: new Date().toISOString(),
    error: {
      code: status === 429 ? 'rate_limited' : 'network_error',
      message: `IP provider request failed with HTTP ${status}.`,
    },
  };
}

export const ipWhoIsProvider: IpCheckProvider = {
  id: 'ipwhois',
  async checkCurrentExit(signal: AbortSignal): Promise<IpCheckResult> {
    const response = await fetch('https://ipwho.is/', {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return createHttpFailure('ipwhois', response.status);
    }

    const data = (await response.json()) as IpWhoIsResponse;
    return normalizeIpWhoIsResponse(data);
  },
};

export const ipApiProvider: IpCheckProvider = {
  id: 'ipapi',
  async checkCurrentExit(signal: AbortSignal): Promise<IpCheckResult> {
    const response = await fetch('https://ipapi.co/json/', {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const failure = createHttpFailure('ipapi', response.status);
      const fallback = await ipWhoIsProvider.checkCurrentExit(signal);
      return fallback.status === 'success' ? fallback : failure;
    }

    const data = (await response.json()) as IpApiResponse;
    const result = normalizeIpApiResponse(data);
    if (result.status === 'success') {
      return result;
    }

    const fallback = await ipWhoIsProvider.checkCurrentExit(signal);
    return fallback.status === 'success' ? fallback : result;
  },
};

export function getIpCheckProvider(providerId: string): IpCheckProvider | undefined {
  if (providerId === ipApiProvider.id) {
    return ipApiProvider;
  }

  if (providerId === ipWhoIsProvider.id) {
    return ipWhoIsProvider;
  }

  return undefined;
}
