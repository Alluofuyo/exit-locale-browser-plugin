import { describe, expect, it } from 'vitest';
import { createErrorResponse, createSuccessResponse, isRuntimeMessage } from './messages';

describe('isRuntimeMessage', () => {
  it('accepts known message types', () => {
    expect(isRuntimeMessage({ type: 'PING' })).toBe(true);
    expect(isRuntimeMessage({ type: 'GET_SETTINGS' })).toBe(true);
    expect(isRuntimeMessage({ type: 'GET_EFFECTIVE_RULE', url: 'https://example.com' })).toBe(true);
    expect(isRuntimeMessage({ type: 'GET_LOCALE_RECOMMENDATION' })).toBe(true);
    expect(isRuntimeMessage({ type: 'APPLY_LOCALE_RECOMMENDATION' })).toBe(true);
  });

  it('rejects unknown or malformed messages', () => {
    expect(isRuntimeMessage(null)).toBe(false);
    expect(isRuntimeMessage({})).toBe(false);
    expect(isRuntimeMessage({ type: 'UNKNOWN' })).toBe(false);
    expect(isRuntimeMessage({ type: 'GET_EFFECTIVE_RULE' })).toBe(false);
  });
});

describe('runtime responses', () => {
  it('creates typed success responses', () => {
    expect(createSuccessResponse({ ok: true })).toEqual({
      ok: true,
      data: { ok: true },
    });
  });

  it('creates typed error responses', () => {
    expect(createErrorResponse('bad_request', 'Bad request')).toEqual({
      ok: false,
      error: {
        code: 'bad_request',
        message: 'Bad request',
      },
    });
  });
});
