import { isRuntimeMessage } from '../src/shared/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  async main() {
    const message = {
      type: 'GET_EFFECTIVE_RULE',
      url: window.location.href,
    } as const;

    if (!isRuntimeMessage(message)) {
      return;
    }

    try {
      await browser.runtime.sendMessage(message);
    } catch {
      // Page-side behavior is fail-open so normal browsing is not blocked.
    }
  },
});
