import { describe, expect, it, vi } from 'vitest';
import { checkCurrentExit, isIpCheckFresh } from './checker';
import type { IpCheckProvider } from './providers';

describe('isIpCheckFresh', () => {
  it('returns true when the result is within ttl', () => {
    const result = {
      status: 'success' as const,
      providerId: 'test',
      checkedAt: '2026-07-07T00:00:00.000Z',
      ip: '203.0.113.10',
    };

    expect(isIpCheckFresh(result, 60000, new Date('2026-07-07T00:00:30.000Z'))).toBe(true);
  });

  it('returns false when the result is stale or failed', () => {
    expect(
      isIpCheckFresh(
        {
          status: 'success',
          providerId: 'test',
          checkedAt: '2026-07-07T00:00:00.000Z',
          ip: '203.0.113.10',
        },
        1000,
        new Date('2026-07-07T00:00:30.000Z'),
      ),
    ).toBe(false);

    expect(
      isIpCheckFresh(
        {
          status: 'failure',
          providerId: 'test',
          checkedAt: '2026-07-07T00:00:00.000Z',
          error: {
            code: 'network_error',
            message: 'Failed',
          },
        },
        60000,
        new Date('2026-07-07T00:00:30.000Z'),
      ),
    ).toBe(false);
  });
});

describe('checkCurrentExit', () => {
  it('returns provider success result', async () => {
    const provider: IpCheckProvider = {
      id: 'test',
      checkCurrentExit: vi.fn(async () => ({
        status: 'success',
        providerId: 'test',
        checkedAt: '2026-07-07T00:00:00.000Z',
        ip: '203.0.113.10',
        country: 'Exampleland',
      })),
    };

    await expect(checkCurrentExit(provider, 5000)).resolves.toMatchObject({
      status: 'success',
      providerId: 'test',
      ip: '203.0.113.10',
      country: 'Exampleland',
    });
  });

  it('normalizes provider failures', async () => {
    const provider: IpCheckProvider = {
      id: 'test',
      checkCurrentExit: vi.fn(async () => {
        throw new Error('Network down');
      }),
    };

    await expect(checkCurrentExit(provider, 5000)).resolves.toMatchObject({
      status: 'failure',
      providerId: 'test',
      error: {
        code: 'network_error',
        message: 'Network down',
      },
    });
  });
});
