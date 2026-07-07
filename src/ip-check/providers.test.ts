import { afterEach, describe, expect, it, vi } from 'vitest';
import { ipApiProvider } from './providers';

describe('ipApiProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps location and language fields from ipapi json responses', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          ip: '8.8.8.8',
          city: 'Mountain View',
          region: 'California',
          country_name: 'United States',
          country_code: 'US',
          org: 'Google LLC',
          asn: 'AS15169',
          timezone: 'America/Los_Angeles',
          latitude: 37.386,
          longitude: -122.0838,
          languages: 'en-US,es-US,haw,fr',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(ipApiProvider.checkCurrentExit(new AbortController().signal)).resolves.toMatchObject({
      status: 'success',
      ip: '8.8.8.8',
      countryCode: 'US',
      timezone: 'America/Los_Angeles',
      latitude: 37.386,
      longitude: -122.0838,
      languages: ['en-US', 'es-US', 'haw', 'fr'],
    });
  });

  it('falls back to ipwho.is when ipapi returns HTTP 403', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('Forbidden', { status: 403 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            ip: '185.220.238.40',
            country: 'Japan',
            country_code: 'JP',
            region: 'Tokyo',
            city: 'Tokyo',
            latitude: 35.7090259,
            longitude: 139.7319925,
            connection: {
              asn: 38136,
              isp: 'Akari Networks Limited',
              org: 'Akari Networks Limited',
            },
            timezone: {
              id: 'Asia/Tokyo',
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(ipApiProvider.checkCurrentExit(new AbortController().signal)).resolves.toMatchObject({
      status: 'success',
      providerId: 'ipwhois',
      ip: '185.220.238.40',
      country: 'Japan',
      countryCode: 'JP',
      timezone: 'Asia/Tokyo',
      latitude: 35.7090259,
      longitude: 139.7319925,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://ipapi.co/json/', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://ipwho.is/', expect.any(Object));
  });
});
