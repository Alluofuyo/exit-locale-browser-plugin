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
  error?: boolean;
  reason?: string;
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
  };
}

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
      return {
        status: 'failure',
        providerId: 'ipapi',
        checkedAt: new Date().toISOString(),
        error: {
          code: response.status === 429 ? 'rate_limited' : 'network_error',
          message: `IP provider request failed with HTTP ${response.status}.`,
        },
      };
    }

    const data = (await response.json()) as IpApiResponse;
    return normalizeIpApiResponse(data);
  },
};

export function getIpCheckProvider(providerId: string): IpCheckProvider | undefined {
  if (providerId === ipApiProvider.id) {
    return ipApiProvider;
  }

  return undefined;
}
