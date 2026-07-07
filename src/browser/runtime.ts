import type { RuntimeMessage, RuntimeResponse } from '../shared/types';

export async function sendRuntimeMessage<T>(message: RuntimeMessage): Promise<RuntimeResponse<T>> {
  return browser.runtime.sendMessage(message);
}

export function getLastRuntimeErrorMessage(): string | undefined {
  const chromeRuntime = (globalThis as typeof globalThis & { chrome?: typeof browser }).chrome?.runtime;
  return chromeRuntime?.lastError?.message;
}
