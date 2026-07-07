import type { IpCheckResult } from '../shared/types';
import type { IpCheckProvider } from './providers';

export function isIpCheckFresh(result: IpCheckResult, ttlMs: number, now = new Date()): boolean {
  if (result.status !== 'success') {
    return false;
  }

  const checkedAtMs = Date.parse(result.checkedAt);
  if (Number.isNaN(checkedAtMs)) {
    return false;
  }

  return now.getTime() - checkedAtMs <= ttlMs;
}

export async function checkCurrentExit(provider: IpCheckProvider, timeoutMs: number): Promise<IpCheckResult> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    return await provider.checkCurrentExit(abortController.signal);
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    const message = error instanceof Error ? error.message : 'Exit IP check failed.';

    return {
      status: 'failure',
      providerId: provider.id,
      checkedAt: new Date().toISOString(),
      error: {
        code: isAbort ? 'timeout' : 'network_error',
        message: isAbort ? 'Exit IP check timed out.' : message,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
