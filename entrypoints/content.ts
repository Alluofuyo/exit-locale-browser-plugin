import {
  createLocaleSpoofingState,
  LOCALE_SPOOFING_CLEAR_EVENT,
  LOCALE_SPOOFING_EVENT,
  serializeLocaleSpoofingState,
} from '../src/content/locale-spoofing';
import { SETTINGS_KEY } from '../src/shared/storage-keys';
import type { EffectiveRule } from '../src/shared/types';

function dispatchLocaleSpoofingState(effectiveRule: EffectiveRule): void {
  window.dispatchEvent(
    new CustomEvent(LOCALE_SPOOFING_EVENT, {
      detail: serializeLocaleSpoofingState(createLocaleSpoofingState(effectiveRule.localeProfile)),
    }),
  );
}

function dispatchLocaleSpoofingClear(): void {
  window.dispatchEvent(new CustomEvent(LOCALE_SPOOFING_CLEAR_EVENT));
}

async function syncEffectiveRule(): Promise<void> {
  const response = await browser.runtime.sendMessage({
    type: 'GET_EFFECTIVE_RULE',
    url: window.location.href,
  } satisfies { type: 'GET_EFFECTIVE_RULE'; url: string });

  if (!response?.ok) {
    return;
  }

  const effectiveRule = response.data as EffectiveRule;
  if (!effectiveRule.enabled) {
    dispatchLocaleSpoofingClear();
    return;
  }

  dispatchLocaleSpoofingState(effectiveRule);
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main() {
    try {
      await syncEffectiveRule();

      browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && SETTINGS_KEY in changes) {
          void syncEffectiveRule().catch(() => undefined);
        }
      });
    } catch {
      // Page-side behavior is fail-open so normal browsing is not blocked.
    }
  },
});
