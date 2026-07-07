import { beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

Object.assign(globalThis, {
  browser: fakeBrowser,
  chrome: fakeBrowser,
});

beforeEach(() => {
  fakeBrowser.reset();
});
