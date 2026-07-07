import type { RuntimeMessage, RuntimeResponse } from './types';

const MESSAGE_TYPES = new Set<RuntimeMessage['type']>([
  'PING',
  'GET_SETTINGS',
  'SAVE_SETTINGS',
  'GET_EFFECTIVE_RULE',
  'CHECK_CURRENT_EXIT',
  'GET_LAST_EXIT_CHECK',
  'GET_LOCALE_RECOMMENDATION',
  'APPLY_LOCALE_RECOMMENDATION',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  if (!MESSAGE_TYPES.has(value.type as RuntimeMessage['type'])) {
    return false;
  }

  if (value.type === 'GET_EFFECTIVE_RULE') {
    return typeof value.url === 'string';
  }

  if (value.type === 'SAVE_SETTINGS') {
    return isRecord(value.settings);
  }

  return true;
}

export function createSuccessResponse<T>(data: T): RuntimeResponse<T> {
  return {
    ok: true,
    data,
  };
}

export function createErrorResponse<T = never>(code: string, message: string): RuntimeResponse<T> {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}
