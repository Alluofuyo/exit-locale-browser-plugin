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
});
