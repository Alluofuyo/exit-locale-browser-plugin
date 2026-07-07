import { resolveEffectiveRule } from '../src/core/rules';
import { checkCurrentExit, isIpCheckFresh } from '../src/ip-check/checker';
import { getIpCheckProvider } from '../src/ip-check/providers';
import { createErrorResponse, createSuccessResponse, isRuntimeMessage } from '../src/shared/messages';
import type { RuntimeMessage, RuntimeResponse } from '../src/shared/types';
import { loadLastIpCheck, loadSettings, saveLastIpCheck, saveSettings } from '../src/storage/settings';

async function handleMessage(message: RuntimeMessage): Promise<RuntimeResponse<unknown>> {
  switch (message.type) {
    case 'PING':
      return createSuccessResponse({ pong: true });
    case 'GET_SETTINGS':
      return createSuccessResponse(await loadSettings());
    case 'SAVE_SETTINGS':
      await saveSettings(message.settings);
      return createSuccessResponse(message.settings);
    case 'GET_EFFECTIVE_RULE': {
      const settings = await loadSettings();
      return createSuccessResponse(resolveEffectiveRule(settings, message.url));
    }
    case 'GET_LAST_EXIT_CHECK':
      return createSuccessResponse(await loadLastIpCheck());
    case 'CHECK_CURRENT_EXIT': {
      const settings = await loadSettings();
      const previous = await loadLastIpCheck();
      const provider = getIpCheckProvider(settings.ipCheck.providerId);

      if (!provider) {
        return createErrorResponse('unsupported_provider', `Unsupported IP check provider: ${settings.ipCheck.providerId}`);
      }

      if (!message.force && isIpCheckFresh(previous, settings.ipCheck.cacheTtlMs)) {
        return createSuccessResponse(previous);
      }

      const result = await checkCurrentExit(provider, settings.ipCheck.timeoutMs);
      await saveLastIpCheck(result);
      return createSuccessResponse(result);
    }
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isRuntimeMessage(message)) {
      return Promise.resolve(createErrorResponse('bad_request', 'Unknown runtime message.'));
    }

    return handleMessage(message);
  });
});
