import {
  createLocaleSpoofingState,
  LOCALE_SPOOFING_EVENT,
  serializeLocaleSpoofingState,
} from '../src/content/locale-spoofing';
import type { EffectiveRule } from '../src/shared/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main() {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'GET_EFFECTIVE_RULE',
        url: window.location.href,
      } satisfies { type: 'GET_EFFECTIVE_RULE'; url: string });

      if (!response?.ok) {
        return;
      }

      const effectiveRule = response.data as EffectiveRule;
      if (!effectiveRule.enabled) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent(LOCALE_SPOOFING_EVENT, {
          detail: serializeLocaleSpoofingState(createLocaleSpoofingState(effectiveRule.localeProfile)),
        }),
      );
    } catch {
      // Page-side behavior is fail-open so normal browsing is not blocked.
    }
  },
});
