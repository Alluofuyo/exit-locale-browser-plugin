import {
  applyLocaleSpoofing,
  LOCALE_SPOOFING_EVENT,
  parseLocaleSpoofingEventDetail,
} from '../src/content/locale-spoofing';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    window.addEventListener(LOCALE_SPOOFING_EVENT, (event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const state = parseLocaleSpoofingEventDetail(event.detail);
      if (state) {
        applyLocaleSpoofing(state);
      }
    });
  },
});
