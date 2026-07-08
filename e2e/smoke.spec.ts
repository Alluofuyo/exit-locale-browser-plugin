import { chromium, expect, type BrowserContext, type Page, type Worker, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

import type { ExtensionSettings } from '../src/shared/types';

const EXTENSION_SETTINGS_KEY = 'extensionSettings';
const GEOLOCATION_ACCURACY_METERS = 50000;
const GEOLOCATION_READ_TIMEOUT_MS = 1000;
const SERVICE_WORKER_TIMEOUT_MS = 10000;

const smokeSettings: ExtensionSettings = {
  schemaVersion: 1,
  enabled: true,
  defaultLocaleProfileId: 'smoke-profile',
  localeProfiles: [
    {
      id: 'smoke-profile',
      name: 'Smoke profile',
      languages: ['ja-JP', 'ja'],
      timezone: 'Asia/Tokyo',
      latitude: 35.6895,
      longitude: 139.6917,
    },
  ],
  siteRules: [],
  ipCheck: {
    providerId: 'ipapi',
    timeoutMs: 5000,
    cacheTtlMs: 60000,
    autoRefreshOnPopupOpen: true,
  },
};

interface LocaleSnapshot {
  language: string;
  languages: string[];
  timezone: string;
  geolocation: GeolocationSnapshot;
}

interface EarlyLocaleSnapshot {
  language: string;
  languages: string[];
  timezone: string;
}

type LocaleEnvironmentSnapshot = EarlyLocaleSnapshot;

interface GeolocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeolocationErrorSnapshot {
  error: string;
}

interface ChromeStorageApi {
  runtime: {
    lastError?: {
      message?: string;
    };
  };
  storage: {
    local: {
      clear(callback: () => void): void;
      set(items: Record<string, unknown>, callback: () => void): void;
    };
  };
}

function getExtensionPath(): string {
  return path.resolve('.output/chrome-mv3');
}

async function getExtensionServiceWorker(context: BrowserContext): Promise<Worker> {
  const existingWorker = context.serviceWorkers().find((worker) => worker.url().startsWith('chrome-extension://'));
  if (existingWorker) {
    return existingWorker;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const workerUrls = context.serviceWorkers().map((worker) => worker.url());
      reject(
        new Error(
          `Extension service worker did not start within ${SERVICE_WORKER_TIMEOUT_MS}ms. Existing workers: ${
            workerUrls.length > 0 ? workerUrls.join(', ') : 'none'
          }`,
        ),
      );
    }, SERVICE_WORKER_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      context.waitForEvent('serviceworker', {
        predicate: (worker) => worker.url().startsWith('chrome-extension://'),
      }),
      timeout,
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function seedExtensionSettings(serviceWorker: Worker, settings: ExtensionSettings): Promise<void> {
  await serviceWorker.evaluate(
    async ({ key, value }) => {
      const chromeApi = (globalThis as typeof globalThis & { chrome: ChromeStorageApi }).chrome;

      await new Promise<void>((resolve, reject) => {
        chromeApi.storage.local.clear(() => {
          const error = chromeApi.runtime.lastError;
          if (error) {
            reject(new Error(error.message ?? 'Failed to clear extension storage.'));
            return;
          }

          resolve();
        });
      });

      await new Promise<void>((resolve, reject) => {
        chromeApi.storage.local.set({ [key]: value }, () => {
          const error = chromeApi.runtime.lastError;
          if (error) {
            reject(new Error(error.message ?? 'Failed to seed extension settings.'));
            return;
          }

          resolve();
        });
      });
    },
    { key: EXTENSION_SETTINGS_KEY, value: settings },
  );
}

async function startSmokeServer(): Promise<{ server: Server; url: string }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html>
      <html>
        <head>
          <title>Exit Locale Smoke</title>
          <script>
            window.__earlyLocaleSnapshot = {
              language: navigator.language,
              languages: Array.from(navigator.languages),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            };
          </script>
        </head>
        <body>ok</body>
      </html>`);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address() as AddressInfo;
  return {
    server,
    url: `http://127.0.0.1:${address.port}/`,
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function readLocaleSnapshot(page: Page): Promise<LocaleSnapshot> {
  const [locale, geolocation] = await Promise.all([readLocaleEnvironmentSnapshot(page), readGeolocationSnapshot(page)]);
  if ('error' in geolocation) {
    throw new Error(geolocation.error);
  }

  return {
    ...locale,
    geolocation,
  };
}

async function readLocaleEnvironmentSnapshot(page: Page): Promise<LocaleEnvironmentSnapshot> {
  return page.evaluate(() => ({
    language: navigator.language,
    languages: [...navigator.languages],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }));
}

async function readGeolocationSnapshot(page: Page): Promise<GeolocationSnapshot | GeolocationErrorSnapshot> {
  return page.evaluate(
    ({ timeoutMs }) =>
      new Promise<GeolocationSnapshot | GeolocationErrorSnapshot>((resolve) => {
        const timeoutId = window.setTimeout(() => {
          resolve({ error: `Geolocation did not respond within ${timeoutMs}ms.` });
        }, timeoutMs);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            window.clearTimeout(timeoutId);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          },
          (error) => {
            window.clearTimeout(timeoutId);
            resolve({ error: error.message });
          },
          { timeout: timeoutMs },
        );
      }),
    { timeoutMs: GEOLOCATION_READ_TIMEOUT_MS },
  );
}

async function readEarlyLocaleSnapshot(page: Page): Promise<EarlyLocaleSnapshot | undefined> {
  return page.evaluate(() => {
    const snapshot = (window as typeof window & { __earlyLocaleSnapshot?: EarlyLocaleSnapshot }).__earlyLocaleSnapshot;
    return snapshot ? { ...snapshot, languages: [...snapshot.languages] } : undefined;
  });
}

async function expectEarlySpoofedLocale(page: Page): Promise<void> {
  await expect(readEarlyLocaleSnapshot(page)).resolves.toEqual({
    language: 'ja-JP',
    languages: ['ja-JP', 'ja'],
    timezone: 'Asia/Tokyo',
  });
}

async function expectSpoofedLocale(page: Page): Promise<void> {
  await expect
    .poll(() => readLocaleEnvironmentSnapshot(page), {
      timeout: 10000,
    })
    .toEqual({
      language: 'ja-JP',
      languages: ['ja-JP', 'ja'],
      timezone: 'Asia/Tokyo',
    });

  await expect
    .poll(() => readGeolocationSnapshot(page), {
      timeout: 10000,
    })
    .toEqual({
      latitude: 35.6895,
      longitude: 139.6917,
      accuracy: GEOLOCATION_ACCURACY_METERS,
    });

  await expect(readLocaleSnapshot(page)).resolves.toEqual({
    language: 'ja-JP',
    languages: ['ja-JP', 'ja'],
    timezone: 'Asia/Tokyo',
    geolocation: {
      latitude: 35.6895,
      longitude: 139.6917,
      accuracy: GEOLOCATION_ACCURACY_METERS,
    },
  });
}

test('spoofs page language, timezone, and geolocation from the active locale profile', async ({}, testInfo) => {
  testInfo.setTimeout(60000);

  const context = await chromium.launchPersistentContext(testInfo.outputPath('user-data-dir'), {
    channel: 'chromium',
    headless: process.env.E2E_HEADLESS === 'false' ? false : undefined,
    args: [
      `--disable-extensions-except=${getExtensionPath()}`,
      `--load-extension=${getExtensionPath()}`,
    ],
  });
  const { server, url } = await startSmokeServer();

  try {
    const serviceWorker = await getExtensionServiceWorker(context);
    await seedExtensionSettings(serviceWorker, smokeSettings);

    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await expectSpoofedLocale(page);

    await page.reload({ waitUntil: 'domcontentloaded' });

    await expectEarlySpoofedLocale(page);
    await expectSpoofedLocale(page);
  } finally {
    // Close the browser first so HTTP keep-alive sockets do not block server.close in CI.
    await context.close();
    await closeServer(server);
  }
});
