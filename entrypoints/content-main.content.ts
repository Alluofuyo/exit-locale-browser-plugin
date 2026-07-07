import {
  applyCachedLocaleSpoofing,
  applyLocaleSpoofing,
  clearCachedLocaleSpoofingState,
  LOCALE_SPOOFING_CLEAR_EVENT,
  LOCALE_SPOOFING_EVENT,
  parseLocaleSpoofingEventDetail,
  writeCachedLocaleSpoofingState,
} from '../src/content/locale-spoofing';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    applyCachedLocaleSpoofing();

    window.addEventListener(LOCALE_SPOOFING_EVENT, (event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const state = parseLocaleSpoofingEventDetail(event.detail);
      if (state) {
        writeCachedLocaleSpoofingState(state);
        applyLocaleSpoofing(state);
      }
    });

    window.addEventListener(LOCALE_SPOOFING_CLEAR_EVENT, () => {
      clearCachedLocaleSpoofingState();
    });
  },
});
