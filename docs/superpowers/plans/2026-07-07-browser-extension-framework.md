# Browser Extension Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WXT + React + TypeScript browser extension scaffold for Chrome, Edge, and Firefox with current exit IP and IP geolocation checking.

**Architecture:** WXT owns extension entrypoint discovery and manifest generation. Background code is the authority for browser APIs, settings, and IP checks; popup/options are React clients; content scripts only request effective rules and apply page-side behavior. Core settings, rule matching, message contracts, storage, and IP provider logic live under `src/` so they can be unit tested outside the browser UI.

**Tech Stack:** WXT, React, TypeScript, Vitest, WebExtension APIs, ipapi.co-compatible default IP provider.

---

## Reference Notes

WXT uses files inside `entrypoints/` as extension entrypoints, and directories such as `entrypoints/popup/index.html` and `entrypoints/options/index.html` are valid popup/options entrypoints. Background and content script files must keep runtime work inside their WXT `main` functions because WXT imports entrypoint modules during builds.

WXT builds different browser targets with the `-b` flag. The Chrome target is default, and Firefox uses `wxt -b firefox`. WXT defaults to MV3 for Chromium browsers and MV2 for Firefox, so Firefox-specific capability differences must be isolated behind wrappers and feature checks.

WXT generates `manifest.json` from `wxt.config.ts` plus entrypoint options. Permissions and host permissions belong in the WXT manifest config.

Unit tests run through Vitest directly and use `wxt/testing/fake-browser` in a setup file for browser API mocks. This avoids coupling pure `src/` tests to WXT entrypoint discovery while still using WXT's browser mock.

## File Structure

Create or modify these files:

- Create: `.gitignore` for generated build, dependency, coverage, and WXT output directories.
- Create: `package.json` for scripts and dependencies.
- Create: `pnpm-workspace.yaml` for pnpm dependency build-script approvals.
- Create: `tsconfig.json` for TypeScript strict mode and WXT-generated types.
- Create: `wxt.config.ts` for React Vite plugin, manifest metadata, permissions, and host permissions.
- Create: `vitest.config.ts` for Vitest and test setup configuration.
- Create: `src/test/setup.ts` for WXT fake browser setup.
- Create: `entrypoints/background.ts` for runtime message handling, settings coordination, and IP check execution.
- Create: `entrypoints/content.ts` for page-side rule requests.
- Create: `entrypoints/popup/index.html`, `entrypoints/popup/main.tsx`, `entrypoints/popup/App.tsx`, `entrypoints/popup/style.css` for the popup UI.
- Create: `entrypoints/options/index.html`, `entrypoints/options/main.tsx`, `entrypoints/options/App.tsx`, `entrypoints/options/style.css` for the options UI.
- Create: `src/shared/types.ts` for extension settings, rules, profiles, IP check, and message types.
- Create: `src/shared/defaults.ts` for default settings and default IP check result values.
- Create: `src/shared/messages.ts` for runtime message guards and typed response helpers.
- Create: `src/core/rules.ts` for hostname matching and effective rule resolution.
- Create: `src/browser/runtime.ts` for runtime browser API wrappers.
- Create: `src/storage/settings.ts` for typed local storage reads and writes.
- Create: `src/ip-check/providers.ts` for provider interfaces and the default ipapi.co provider.
- Create: `src/ip-check/checker.ts` for timeout, cache freshness, normalization, and exported check helpers.
- Create: `src/core/rules.test.ts`, `src/shared/messages.test.ts`, `src/storage/settings.test.ts`, `src/ip-check/checker.test.ts` for unit coverage.
- Create: `README.md` for installation, development, build, browser loading, and test commands.

---

### Task 1: Project Tooling And WXT Configuration

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `wxt.config.ts`
- Create: `vitest.config.ts`
- Create: `pnpm-workspace.yaml`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Create `.gitignore`**

Write:

```gitignore
node_modules/
.output/
.wxt/
coverage/
dist/
*.log
```

- [ ] **Step 2: Create `package.json`**

Write:

```json
{
  "name": "locale-proxy-browser-plugin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.9.0",
  "scripts": {
    "dev": "wxt",
    "dev:firefox": "wxt -b firefox",
    "build": "wxt build",
    "build:chrome": "wxt build -b chrome",
    "build:firefox": "wxt build -b firefox",
    "zip:chrome": "wxt zip -b chrome",
    "zip:firefox": "wxt zip -b firefox",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^6.0.3",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0",
    "wxt": "^0.20.27"
  }
}
```

- [ ] **Step 3: Create `tsconfig.json`**

Write:

```json
{
  "extends": "./.wxt/tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["entrypoints", "src", "wxt.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `wxt.config.ts`**

Write:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'wxt';

export default defineConfig({
  vite: () => ({
    plugins: [react()],
  }),
  manifest: () => ({
    name: 'Locale Proxy Browser Plugin',
    description: 'Inspect current exit IP and prepare browser proxy and locale rules.',
    permissions: ['storage', 'tabs'],
    host_permissions: ['https://ipapi.co/*'],
    action: {
      default_title: 'Locale Proxy',
    },
  }),
});
```

- [ ] **Step 5: Create `vitest.config.ts`**

Write:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
```

- [ ] **Step 6: Create `src/test/setup.ts`**

Write:

```ts
import { beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

Object.assign(globalThis, {
  browser: fakeBrowser,
  chrome: fakeBrowser,
});

beforeEach(() => {
  fakeBrowser.reset();
});
```

- [ ] **Step 7: Create `pnpm-workspace.yaml`**

Write:

```yaml
allowBuilds:
  esbuild: true
  spawn-sync: true
```

- [ ] **Step 8: Install dependencies**

Run:

```bash
pnpm install
```

Expected: `node_modules/` and `pnpm-lock.yaml` are created, and pnpm exits with code 0.

- [ ] **Step 9: Verify dependency graph and WXT CLI**

Run:

```bash
pnpm peers check
```

Expected: `No peer dependency issues found`.

Run:

```bash
pnpm exec wxt --version
```

Expected: prints the installed WXT version. Full `pnpm typecheck` runs after entrypoints exist because WXT needs at least one entrypoint to generate `.wxt/tsconfig.json`.

- [ ] **Step 10: Commit tooling**

Run:

```bash
git add .gitignore package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json wxt.config.ts vitest.config.ts src/test/setup.ts
git commit -m "chore: add WXT React TypeScript tooling"
```

Expected: commit succeeds.

---

### Task 2: Shared Types, Defaults, Rule Matching, And Message Contracts

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/defaults.ts`
- Create: `src/core/rules.ts`
- Create: `src/core/rules.test.ts`
- Create: `src/shared/messages.ts`
- Create: `src/shared/messages.test.ts`

- [ ] **Step 1: Write rule matching tests in `src/core/rules.test.ts`**

Write:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../shared/defaults';
import type { SiteRule } from '../shared/types';
import { matchesSiteRule, resolveEffectiveRule } from './rules';

describe('matchesSiteRule', () => {
  it('matches exact hostnames case-insensitively', () => {
    const rule: SiteRule = {
      id: 'rule-1',
      enabled: true,
      hostnamePattern: 'Example.COM',
      proxyProfileId: 'direct',
      localeProfileId: 'default',
    };

    expect(matchesSiteRule(rule, 'https://example.com/path')).toBe(true);
    expect(matchesSiteRule(rule, 'https://sub.example.com/path')).toBe(false);
  });

  it('matches wildcard subdomains', () => {
    const rule: SiteRule = {
      id: 'rule-2',
      enabled: true,
      hostnamePattern: '*.example.com',
      proxyProfileId: 'direct',
      localeProfileId: 'default',
    };

    expect(matchesSiteRule(rule, 'https://app.example.com')).toBe(true);
    expect(matchesSiteRule(rule, 'https://deep.app.example.com')).toBe(true);
    expect(matchesSiteRule(rule, 'https://example.com')).toBe(false);
  });
});

describe('resolveEffectiveRule', () => {
  it('returns defaults when no site rule matches', () => {
    const result = resolveEffectiveRule(DEFAULT_SETTINGS, 'https://unknown.test');

    expect(result.url).toBe('https://unknown.test');
    expect(result.proxyProfile.id).toBe('direct');
    expect(result.localeProfile.id).toBe('default');
    expect(result.siteRule).toBeUndefined();
  });

  it('returns the first enabled matching rule', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      siteRules: [
        {
          id: 'disabled',
          enabled: false,
          hostnamePattern: 'example.com',
          proxyProfileId: 'direct',
          localeProfileId: 'default',
        },
        {
          id: 'enabled',
          enabled: true,
          hostnamePattern: 'example.com',
          proxyProfileId: 'direct',
          localeProfileId: 'default',
        },
      ],
    };

    const result = resolveEffectiveRule(settings, 'https://example.com');

    expect(result.siteRule?.id).toBe('enabled');
  });
});
```

- [ ] **Step 2: Write message contract tests in `src/shared/messages.test.ts`**

Write:

```ts
import { describe, expect, it } from 'vitest';
import { createErrorResponse, createSuccessResponse, isRuntimeMessage } from './messages';

describe('isRuntimeMessage', () => {
  it('accepts known message types', () => {
    expect(isRuntimeMessage({ type: 'PING' })).toBe(true);
    expect(isRuntimeMessage({ type: 'GET_SETTINGS' })).toBe(true);
    expect(isRuntimeMessage({ type: 'GET_EFFECTIVE_RULE', url: 'https://example.com' })).toBe(true);
  });

  it('rejects unknown or malformed messages', () => {
    expect(isRuntimeMessage(null)).toBe(false);
    expect(isRuntimeMessage({})).toBe(false);
    expect(isRuntimeMessage({ type: 'UNKNOWN' })).toBe(false);
    expect(isRuntimeMessage({ type: 'GET_EFFECTIVE_RULE' })).toBe(false);
  });
});

describe('runtime responses', () => {
  it('creates typed success responses', () => {
    expect(createSuccessResponse({ ok: true })).toEqual({
      ok: true,
      data: { ok: true },
    });
  });

  it('creates typed error responses', () => {
    expect(createErrorResponse('bad_request', 'Bad request')).toEqual({
      ok: false,
      error: {
        code: 'bad_request',
        message: 'Bad request',
      },
    });
  });
});
```

- [ ] **Step 3: Run the new tests and verify they fail**

Run:

```bash
pnpm test -- src/core/rules.test.ts src/shared/messages.test.ts
```

Expected: fail because `src/shared/defaults.ts`, `src/shared/types.ts`, `src/core/rules.ts`, and `src/shared/messages.ts` do not exist yet.

- [ ] **Step 4: Create `src/shared/types.ts`**

Write:

```ts
export type ProxyMode = 'direct' | 'system' | 'manual';

export interface ProxyProfile {
  id: string;
  name: string;
  mode: ProxyMode;
  host?: string;
  port?: number;
}

export interface LocaleProfile {
  id: string;
  name: string;
  languages: string[];
  timezone: string;
  latitude?: number;
  longitude?: number;
}

export interface SiteRule {
  id: string;
  enabled: boolean;
  hostnamePattern: string;
  proxyProfileId: string;
  localeProfileId: string;
}

export interface IpCheckSettings {
  providerId: string;
  timeoutMs: number;
  cacheTtlMs: number;
  autoRefreshOnPopupOpen: boolean;
}

export interface ExtensionSettings {
  schemaVersion: 1;
  enabled: boolean;
  defaultProxyProfileId: string;
  defaultLocaleProfileId: string;
  proxyProfiles: ProxyProfile[];
  localeProfiles: LocaleProfile[];
  siteRules: SiteRule[];
  ipCheck: IpCheckSettings;
}

export interface EffectiveRule {
  url: string;
  enabled: boolean;
  proxyProfile: ProxyProfile;
  localeProfile: LocaleProfile;
  siteRule?: SiteRule;
}

export type IpCheckErrorCode =
  | 'network_error'
  | 'timeout'
  | 'rate_limited'
  | 'invalid_response'
  | 'unsupported_provider';

export interface IpCheckError {
  code: IpCheckErrorCode;
  message: string;
}

export interface IpCheckResult {
  status: 'success' | 'failure';
  providerId: string;
  checkedAt: string;
  ip?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  isp?: string;
  asn?: string;
  timezone?: string;
  error?: IpCheckError;
}

export type RuntimeMessage =
  | { type: 'PING' }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: ExtensionSettings }
  | { type: 'GET_EFFECTIVE_RULE'; url: string }
  | { type: 'CHECK_CURRENT_EXIT'; force?: boolean }
  | { type: 'GET_LAST_EXIT_CHECK' };

export type RuntimeResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

- [ ] **Step 5: Create `src/shared/defaults.ts`**

Write:

```ts
import type { ExtensionSettings, IpCheckResult } from './types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  schemaVersion: 1,
  enabled: true,
  defaultProxyProfileId: 'direct',
  defaultLocaleProfileId: 'default',
  proxyProfiles: [
    {
      id: 'direct',
      name: 'Direct connection',
      mode: 'direct',
    },
  ],
  localeProfiles: [
    {
      id: 'default',
      name: 'Browser default',
      languages: ['en-US', 'en'],
      timezone: 'UTC',
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

export const EMPTY_IP_CHECK_RESULT: IpCheckResult = {
  status: 'failure',
  providerId: DEFAULT_SETTINGS.ipCheck.providerId,
  checkedAt: new Date(0).toISOString(),
  error: {
    code: 'network_error',
    message: 'No exit IP check has been completed.',
  },
};
```

- [ ] **Step 6: Create `src/core/rules.ts`**

Write:

```ts
import type { EffectiveRule, ExtensionSettings, LocaleProfile, ProxyProfile, SiteRule } from '../shared/types';

function getHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

export function matchesSiteRule(rule: SiteRule, url: string): boolean {
  if (!rule.enabled) {
    return false;
  }

  const hostname = getHostname(url);
  if (!hostname) {
    return false;
  }

  const pattern = rule.hostnamePattern.trim().toLowerCase();
  if (pattern === '*') {
    return true;
  }

  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return hostname.endsWith(`.${suffix}`);
  }

  return hostname === pattern;
}

function findProxyProfile(settings: ExtensionSettings, profileId: string): ProxyProfile {
  return (
    settings.proxyProfiles.find((profile) => profile.id === profileId) ??
    settings.proxyProfiles.find((profile) => profile.id === settings.defaultProxyProfileId) ??
    settings.proxyProfiles[0]
  );
}

function findLocaleProfile(settings: ExtensionSettings, profileId: string): LocaleProfile {
  return (
    settings.localeProfiles.find((profile) => profile.id === profileId) ??
    settings.localeProfiles.find((profile) => profile.id === settings.defaultLocaleProfileId) ??
    settings.localeProfiles[0]
  );
}

export function resolveEffectiveRule(settings: ExtensionSettings, url: string): EffectiveRule {
  const siteRule = settings.siteRules.find((rule) => matchesSiteRule(rule, url));
  const proxyProfileId = siteRule?.proxyProfileId ?? settings.defaultProxyProfileId;
  const localeProfileId = siteRule?.localeProfileId ?? settings.defaultLocaleProfileId;
  const proxyProfile = findProxyProfile(settings, proxyProfileId);
  const localeProfile = findLocaleProfile(settings, localeProfileId);

  if (!proxyProfile || !localeProfile) {
    throw new Error('Settings must contain at least one proxy profile and one locale profile.');
  }

  return {
    url,
    enabled: settings.enabled,
    proxyProfile,
    localeProfile,
    siteRule,
  };
}
```

- [ ] **Step 7: Create `src/shared/messages.ts`**

Write:

```ts
import type { RuntimeMessage, RuntimeResponse } from './types';

const MESSAGE_TYPES = new Set<RuntimeMessage['type']>([
  'PING',
  'GET_SETTINGS',
  'SAVE_SETTINGS',
  'GET_EFFECTIVE_RULE',
  'CHECK_CURRENT_EXIT',
  'GET_LAST_EXIT_CHECK',
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
```

- [ ] **Step 8: Run tests**

Run:

```bash
pnpm test -- src/core/rules.test.ts src/shared/messages.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit shared core**

Run:

```bash
git add src/shared src/core
git commit -m "feat: add shared settings and rule contracts"
```

Expected: commit succeeds.

---

### Task 3: Storage And Browser Runtime Wrappers

**Files:**
- Create: `src/browser/runtime.ts`
- Create: `src/storage/settings.ts`
- Create: `src/storage/settings.test.ts`

- [ ] **Step 1: Write storage tests in `src/storage/settings.test.ts`**

Write:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_SETTINGS } from '../shared/defaults';
import { loadLastIpCheck, loadSettings, saveLastIpCheck, saveSettings } from './settings';

describe('settings storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns default settings when storage is empty', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('saves and loads settings', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      enabled: false,
    };

    await saveSettings(settings);

    await expect(loadSettings()).resolves.toEqual(settings);
  });

  it('falls back to defaults when settings are invalid', async () => {
    await browser.storage.local.set({
      extensionSettings: {
        schemaVersion: 99,
        enabled: 'yes',
      },
    });

    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('saves and loads the last IP check result', async () => {
    const result = {
      status: 'success' as const,
      providerId: 'ipapi',
      checkedAt: '2026-07-07T00:00:00.000Z',
      ip: '203.0.113.10',
      country: 'Exampleland',
    };

    await saveLastIpCheck(result);

    await expect(loadLastIpCheck()).resolves.toEqual(result);
  });
});
```

- [ ] **Step 2: Run storage tests and verify they fail**

Run:

```bash
pnpm test -- src/storage/settings.test.ts
```

Expected: fail because `src/storage/settings.ts` does not exist.

- [ ] **Step 3: Create `src/browser/runtime.ts`**

Write:

```ts
import type { RuntimeMessage, RuntimeResponse } from '../shared/types';

export async function sendRuntimeMessage<T>(message: RuntimeMessage): Promise<RuntimeResponse<T>> {
  return browser.runtime.sendMessage(message);
}

export function getLastRuntimeErrorMessage(): string | undefined {
  const chromeRuntime = globalThis.chrome?.runtime;
  return chromeRuntime?.lastError?.message;
}
```

- [ ] **Step 4: Create `src/storage/settings.ts`**

Write:

```ts
import { DEFAULT_SETTINGS, EMPTY_IP_CHECK_RESULT } from '../shared/defaults';
import type { ExtensionSettings, IpCheckResult } from '../shared/types';

const SETTINGS_KEY = 'extensionSettings';
const LAST_IP_CHECK_KEY = 'lastIpCheck';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isExtensionSettings(value: unknown): value is ExtensionSettings {
  if (!isObject(value)) {
    return false;
  }

  return (
    value.schemaVersion === 1 &&
    typeof value.enabled === 'boolean' &&
    typeof value.defaultProxyProfileId === 'string' &&
    typeof value.defaultLocaleProfileId === 'string' &&
    Array.isArray(value.proxyProfiles) &&
    Array.isArray(value.localeProfiles) &&
    Array.isArray(value.siteRules) &&
    isObject(value.ipCheck)
  );
}

export function isIpCheckResult(value: unknown): value is IpCheckResult {
  if (!isObject(value)) {
    return false;
  }

  return (
    (value.status === 'success' || value.status === 'failure') &&
    typeof value.providerId === 'string' &&
    typeof value.checkedAt === 'string'
  );
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const values = await browser.storage.local.get(SETTINGS_KEY);
  const value = values[SETTINGS_KEY];
  return isExtensionSettings(value) ? value : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await browser.storage.local.set({
    [SETTINGS_KEY]: settings,
  });
}

export async function loadLastIpCheck(): Promise<IpCheckResult> {
  const values = await browser.storage.local.get(LAST_IP_CHECK_KEY);
  const value = values[LAST_IP_CHECK_KEY];
  return isIpCheckResult(value) ? value : EMPTY_IP_CHECK_RESULT;
}

export async function saveLastIpCheck(result: IpCheckResult): Promise<void> {
  await browser.storage.local.set({
    [LAST_IP_CHECK_KEY]: result,
  });
}
```

- [ ] **Step 5: Run storage tests**

Run:

```bash
pnpm test -- src/storage/settings.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit storage and browser wrappers**

Run:

```bash
git add src/browser src/storage
git commit -m "feat: add extension storage wrappers"
```

Expected: commit succeeds.

---

### Task 4: Exit IP Provider And Checker

**Files:**
- Create: `src/ip-check/providers.ts`
- Create: `src/ip-check/checker.ts`
- Create: `src/ip-check/checker.test.ts`

- [ ] **Step 1: Write IP checker tests in `src/ip-check/checker.test.ts`**

Write:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { IpCheckProvider } from './providers';
import { checkCurrentExit, isIpCheckFresh } from './checker';

describe('isIpCheckFresh', () => {
  it('returns true when the result is within ttl', () => {
    const result = {
      status: 'success' as const,
      providerId: 'test',
      checkedAt: '2026-07-07T00:00:00.000Z',
      ip: '203.0.113.10',
    };

    expect(isIpCheckFresh(result, 60000, new Date('2026-07-07T00:00:30.000Z'))).toBe(true);
  });

  it('returns false when the result is stale or failed', () => {
    expect(
      isIpCheckFresh(
        {
          status: 'success',
          providerId: 'test',
          checkedAt: '2026-07-07T00:00:00.000Z',
          ip: '203.0.113.10',
        },
        1000,
        new Date('2026-07-07T00:00:30.000Z'),
      ),
    ).toBe(false);

    expect(
      isIpCheckFresh(
        {
          status: 'failure',
          providerId: 'test',
          checkedAt: '2026-07-07T00:00:00.000Z',
          error: {
            code: 'network_error',
            message: 'Failed',
          },
        },
        60000,
        new Date('2026-07-07T00:00:30.000Z'),
      ),
    ).toBe(false);
  });
});

describe('checkCurrentExit', () => {
  it('returns provider success result', async () => {
    const provider: IpCheckProvider = {
      id: 'test',
      checkCurrentExit: vi.fn(async () => ({
        status: 'success',
        providerId: 'test',
        checkedAt: '2026-07-07T00:00:00.000Z',
        ip: '203.0.113.10',
        country: 'Exampleland',
      })),
    };

    await expect(checkCurrentExit(provider, 5000)).resolves.toMatchObject({
      status: 'success',
      providerId: 'test',
      ip: '203.0.113.10',
      country: 'Exampleland',
    });
  });

  it('normalizes provider failures', async () => {
    const provider: IpCheckProvider = {
      id: 'test',
      checkCurrentExit: vi.fn(async () => {
        throw new Error('Network down');
      }),
    };

    await expect(checkCurrentExit(provider, 5000)).resolves.toMatchObject({
      status: 'failure',
      providerId: 'test',
      error: {
        code: 'network_error',
        message: 'Network down',
      },
    });
  });
});
```

- [ ] **Step 2: Run IP checker tests and verify they fail**

Run:

```bash
pnpm test -- src/ip-check/checker.test.ts
```

Expected: fail because `src/ip-check/providers.ts` and `src/ip-check/checker.ts` do not exist.

- [ ] **Step 3: Create `src/ip-check/providers.ts`**

Write:

```ts
import type { IpCheckResult } from '../shared/types';

export interface IpCheckProvider {
  id: string;
  checkCurrentExit(signal: AbortSignal): Promise<IpCheckResult>;
}

interface IpApiResponse {
  ip?: string;
  city?: string;
  region?: string;
  country_name?: string;
  country_code?: string;
  org?: string;
  asn?: string;
  timezone?: string;
  error?: boolean;
  reason?: string;
}

function normalizeIpApiResponse(data: IpApiResponse): IpCheckResult {
  if (data.error || !data.ip) {
    return {
      status: 'failure',
      providerId: 'ipapi',
      checkedAt: new Date().toISOString(),
      error: {
        code: data.error ? 'rate_limited' : 'invalid_response',
        message: data.reason ?? 'IP provider returned an invalid response.',
      },
    };
  }

  return {
    status: 'success',
    providerId: 'ipapi',
    checkedAt: new Date().toISOString(),
    ip: data.ip,
    country: data.country_name,
    countryCode: data.country_code,
    region: data.region,
    city: data.city,
    isp: data.org,
    asn: data.asn,
    timezone: data.timezone,
  };
}

export const ipApiProvider: IpCheckProvider = {
  id: 'ipapi',
  async checkCurrentExit(signal: AbortSignal): Promise<IpCheckResult> {
    const response = await fetch('https://ipapi.co/json/', {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        status: 'failure',
        providerId: 'ipapi',
        checkedAt: new Date().toISOString(),
        error: {
          code: response.status === 429 ? 'rate_limited' : 'network_error',
          message: `IP provider request failed with HTTP ${response.status}.`,
        },
      };
    }

    const data = (await response.json()) as IpApiResponse;
    return normalizeIpApiResponse(data);
  },
};

export function getIpCheckProvider(providerId: string): IpCheckProvider | undefined {
  if (providerId === ipApiProvider.id) {
    return ipApiProvider;
  }

  return undefined;
}
```

- [ ] **Step 4: Create `src/ip-check/checker.ts`**

Write:

```ts
import type { IpCheckResult } from '../shared/types';
import type { IpCheckProvider } from './providers';

export function isIpCheckFresh(result: IpCheckResult, ttlMs: number, now = new Date()): boolean {
  if (result.status !== 'success') {
    return false;
  }

  const checkedAtMs = Date.parse(result.checkedAt);
  if (Number.isNaN(checkedAtMs)) {
    return false;
  }

  return now.getTime() - checkedAtMs <= ttlMs;
}

export async function checkCurrentExit(provider: IpCheckProvider, timeoutMs: number): Promise<IpCheckResult> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    return await provider.checkCurrentExit(abortController.signal);
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    const message = error instanceof Error ? error.message : 'Exit IP check failed.';

    return {
      status: 'failure',
      providerId: provider.id,
      checkedAt: new Date().toISOString(),
      error: {
        code: isAbort ? 'timeout' : 'network_error',
        message: isAbort ? 'Exit IP check timed out.' : message,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 5: Run IP checker tests**

Run:

```bash
pnpm test -- src/ip-check/checker.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit IP checker**

Run:

```bash
git add src/ip-check
git commit -m "feat: add exit IP checking provider"
```

Expected: commit succeeds.

---

### Task 5: Background And Content Entrypoints

**Files:**
- Create: `entrypoints/background.ts`
- Create: `entrypoints/content.ts`

- [ ] **Step 1: Create `entrypoints/background.ts`**

Write:

```ts
import { resolveEffectiveRule } from '../src/core/rules';
import { checkCurrentExit } from '../src/ip-check/checker';
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

      if (!message.force) {
        const { isIpCheckFresh } = await import('../src/ip-check/checker');
        if (isIpCheckFresh(previous, settings.ipCheck.cacheTtlMs)) {
          return createSuccessResponse(previous);
        }
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
```

- [ ] **Step 2: Create `entrypoints/content.ts`**

Write:

```ts
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
```

- [ ] **Step 3: Typecheck entrypoints**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit runtime entrypoints**

Run:

```bash
git add entrypoints/background.ts entrypoints/content.ts
git commit -m "feat: add background and content entrypoints"
```

Expected: commit succeeds.

---

### Task 6: Popup UI For Exit IP Status

**Files:**
- Create: `entrypoints/popup/index.html`
- Create: `entrypoints/popup/main.tsx`
- Create: `entrypoints/popup/App.tsx`
- Create: `entrypoints/popup/style.css`

- [ ] **Step 1: Create `entrypoints/popup/index.html`**

Write:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Locale Proxy</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `entrypoints/popup/main.tsx`**

Write:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Create `entrypoints/popup/App.tsx`**

Write:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../src/browser/runtime';
import type { ExtensionSettings, IpCheckResult, RuntimeResponse } from '../../src/shared/types';

type PopupState =
  | { status: 'loading' }
  | { status: 'ready'; settings: ExtensionSettings; result: IpCheckResult; refreshing: boolean }
  | { status: 'error'; message: string };

function getLocationLabel(result: IpCheckResult): string {
  return [result.city, result.region, result.country].filter(Boolean).join(', ') || 'Unknown location';
}

function formatCheckedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Never';
  }

  return date.toLocaleString();
}

export function App() {
  const [state, setState] = useState<PopupState>({ status: 'loading' });

  const load = useCallback(async (force = false) => {
    setState((current) =>
      current.status === 'ready' ? { ...current, refreshing: true } : { status: 'loading' },
    );

    const settingsResponse = await sendRuntimeMessage<ExtensionSettings>({ type: 'GET_SETTINGS' });
    if (!settingsResponse.ok) {
      setState({ status: 'error', message: settingsResponse.error.message });
      return;
    }

    const resultResponse = await sendRuntimeMessage<IpCheckResult>({
      type: 'CHECK_CURRENT_EXIT',
      force,
    });

    if (!resultResponse.ok) {
      setState({ status: 'error', message: resultResponse.error.message });
      return;
    }

    setState({
      status: 'ready',
      settings: settingsResponse.data,
      result: resultResponse.data,
      refreshing: false,
    });
  }, []);

  useEffect(() => {
    void load(false).catch((error: unknown) => {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to load popup state.',
      });
    });
  }, [load]);

  if (state.status === 'loading') {
    return <main className="popup"><p className="muted">Checking current exit...</p></main>;
  }

  if (state.status === 'error') {
    return (
      <main className="popup">
        <header>
          <h1>Locale Proxy</h1>
        </header>
        <p className="error">{state.message}</p>
        <button type="button" onClick={() => void load(true)}>Retry</button>
      </main>
    );
  }

  const { result, settings, refreshing } = state;
  const isSuccess = result.status === 'success';

  return (
    <main className="popup">
      <header>
        <h1>Locale Proxy</h1>
        <span className={settings.enabled ? 'status enabled' : 'status disabled'}>
          {settings.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </header>

      <section className="ip-panel">
        <div className="label">Current exit IP</div>
        <div className="ip-value">{isSuccess ? result.ip : 'Unavailable'}</div>
        <div className="location">{isSuccess ? getLocationLabel(result) : result.error?.message}</div>
      </section>

      <dl className="details">
        <div>
          <dt>ISP / ASN</dt>
          <dd>{[result.isp, result.asn].filter(Boolean).join(' / ') || 'Unknown'}</dd>
        </div>
        <div>
          <dt>Timezone</dt>
          <dd>{result.timezone || 'Unknown'}</dd>
        </div>
        <div>
          <dt>Provider</dt>
          <dd>{result.providerId}</dd>
        </div>
        <div>
          <dt>Checked</dt>
          <dd>{formatCheckedAt(result.checkedAt)}</dd>
        </div>
      </dl>

      <button type="button" disabled={refreshing} onClick={() => void load(true)}>
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </main>
  );
}
```

- [ ] **Step 4: Create `entrypoints/popup/style.css`**

Write:

```css
:root {
  color: #162033;
  background: #f7f8fb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  width: 340px;
  margin: 0;
}

button {
  width: 100%;
  border: 0;
  border-radius: 6px;
  background: #2557d6;
  color: white;
  cursor: pointer;
  font-weight: 700;
  padding: 10px 12px;
}

button:disabled {
  cursor: default;
  opacity: 0.65;
}

.popup {
  display: grid;
  gap: 14px;
  padding: 16px;
}

header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

h1 {
  font-size: 18px;
  margin: 0;
}

.status {
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
}

.enabled {
  background: #d9fbe6;
  color: #106b35;
}

.disabled {
  background: #eceff5;
  color: #5d6679;
}

.ip-panel {
  background: white;
  border: 1px solid #dfe4ee;
  border-radius: 8px;
  padding: 14px;
}

.label,
dt {
  color: #687386;
  font-size: 12px;
}

.ip-value {
  font-size: 24px;
  font-weight: 800;
  margin-top: 4px;
  word-break: break-all;
}

.location {
  color: #354054;
  margin-top: 4px;
}

.details {
  display: grid;
  gap: 8px;
  margin: 0;
}

.details div {
  display: grid;
  gap: 2px;
}

dd {
  margin: 0;
  word-break: break-word;
}

.muted {
  color: #687386;
}

.error {
  color: #b42318;
  margin: 0;
}
```

- [ ] **Step 5: Typecheck popup**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit popup UI**

Run:

```bash
git add entrypoints/popup
git commit -m "feat: add popup exit IP status"
```

Expected: commit succeeds.

---

### Task 7: Options UI For Settings

**Files:**
- Create: `entrypoints/options/index.html`
- Create: `entrypoints/options/main.tsx`
- Create: `entrypoints/options/App.tsx`
- Create: `entrypoints/options/style.css`

- [ ] **Step 1: Create `entrypoints/options/index.html`**

Write:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="manifest.open_in_tab" content="true" />
    <title>Locale Proxy Options</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `entrypoints/options/main.tsx`**

Write:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Create `entrypoints/options/App.tsx`**

Write:

```tsx
import { useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../src/browser/runtime';
import type { ExtensionSettings } from '../../src/shared/types';

type OptionsState =
  | { status: 'loading' }
  | { status: 'ready'; settings: ExtensionSettings; saved: boolean }
  | { status: 'error'; message: string };

export function App() {
  const [state, setState] = useState<OptionsState>({ status: 'loading' });

  useEffect(() => {
    void sendRuntimeMessage<ExtensionSettings>({ type: 'GET_SETTINGS' }).then((response) => {
      if (response.ok) {
        setState({ status: 'ready', settings: response.data, saved: false });
      } else {
        setState({ status: 'error', message: response.error.message });
      }
    });
  }, []);

  async function save(settings: ExtensionSettings) {
    const response = await sendRuntimeMessage<ExtensionSettings>({
      type: 'SAVE_SETTINGS',
      settings,
    });

    if (response.ok) {
      setState({ status: 'ready', settings: response.data, saved: true });
    } else {
      setState({ status: 'error', message: response.error.message });
    }
  }

  if (state.status === 'loading') {
    return <main className="options"><p>Loading settings...</p></main>;
  }

  if (state.status === 'error') {
    return <main className="options"><p className="error">{state.message}</p></main>;
  }

  const { settings, saved } = state;

  return (
    <main className="options">
      <header>
        <h1>Locale Proxy Settings</h1>
        {saved && <span className="saved">Saved</span>}
      </header>

      <section>
        <h2>General</h2>
        <label className="row">
          <span>Extension enabled</span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => void save({ ...settings, enabled: event.currentTarget.checked })}
          />
        </label>
      </section>

      <section>
        <h2>Exit IP check</h2>
        <label>
          Provider
          <select
            value={settings.ipCheck.providerId}
            onChange={(event) =>
              void save({
                ...settings,
                ipCheck: {
                  ...settings.ipCheck,
                  providerId: event.currentTarget.value,
                },
              })
            }
          >
            <option value="ipapi">ipapi.co</option>
          </select>
        </label>

        <label>
          Timeout in milliseconds
          <input
            type="number"
            min={1000}
            step={500}
            value={settings.ipCheck.timeoutMs}
            onChange={(event) =>
              void save({
                ...settings,
                ipCheck: {
                  ...settings.ipCheck,
                  timeoutMs: Number(event.currentTarget.value),
                },
              })
            }
          />
        </label>

        <label>
          Cache TTL in milliseconds
          <input
            type="number"
            min={0}
            step={1000}
            value={settings.ipCheck.cacheTtlMs}
            onChange={(event) =>
              void save({
                ...settings,
                ipCheck: {
                  ...settings.ipCheck,
                  cacheTtlMs: Number(event.currentTarget.value),
                },
              })
            }
          />
        </label>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Create `entrypoints/options/style.css`**

Write:

```css
:root {
  color: #172033;
  background: #f6f7fb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

.options {
  display: grid;
  gap: 20px;
  margin: 0 auto;
  max-width: 760px;
  padding: 32px 20px;
}

header {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

h1,
h2 {
  margin: 0;
}

h1 {
  font-size: 28px;
}

h2 {
  font-size: 18px;
}

section {
  background: white;
  border: 1px solid #dfe4ee;
  border-radius: 8px;
  display: grid;
  gap: 16px;
  padding: 20px;
}

label {
  color: #344054;
  display: grid;
  gap: 8px;
  font-weight: 700;
}

.row {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

input,
select {
  border: 1px solid #cfd6e4;
  border-radius: 6px;
  font: inherit;
  padding: 9px 10px;
}

.saved {
  background: #d9fbe6;
  border-radius: 999px;
  color: #106b35;
  font-size: 13px;
  font-weight: 700;
  padding: 5px 10px;
}

.error {
  color: #b42318;
}
```

- [ ] **Step 5: Typecheck options**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit options UI**

Run:

```bash
git add entrypoints/options
git commit -m "feat: add options settings page"
```

Expected: commit succeeds.

---

### Task 8: README, Build Verification, And Codebase Index

**Files:**
- Create: `README.md`
- Modify: `.codebase-memory/graph.db.zst`
- Modify: `.codebase-memory/artifact.json`
- Modify: `.codebase-memory/.gitattributes`

- [ ] **Step 1: Create `README.md`**

Write:

```md
# Locale Proxy Browser Plugin

WXT + React + TypeScript browser extension scaffold for Chrome, Edge, and Firefox.

## Features

- React popup and options pages
- Background service for privileged extension actions
- Content script scaffold for page-side behavior
- Typed settings, messages, and rule matching
- Current exit IP and geolocation check through a replaceable provider interface
- Vitest coverage for core logic

## Development

Install dependencies:

```bash
pnpm install
```

Start the Chromium development build:

```bash
pnpm dev
```

Start the Firefox development build:

```bash
pnpm dev:firefox
```

## Build

Build Chrome and Edge output:

```bash
pnpm build:chrome
```

Build Firefox output:

```bash
pnpm build:firefox
```

WXT writes browser output under `.output/`.

## Tests

Run unit tests:

```bash
pnpm test
```

Run TypeScript checks:

```bash
pnpm typecheck
```

## Loading The Extension

Chrome or Edge:

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable developer mode.
3. Load the `.output/chrome-mv3` unpacked extension directory.

Firefox:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on".
3. Select the manifest file inside the Firefox output directory.
```

- [ ] **Step 2: Run unit tests**

Run:

```bash
pnpm test
```

Expected: PASS for all tests.

- [ ] **Step 3: Run TypeScript check**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Build Chrome target**

Run:

```bash
pnpm build:chrome
```

Expected: WXT exits with code 0 and writes Chrome output under `.output/`.

- [ ] **Step 5: Build Firefox target**

Run:

```bash
pnpm build:firefox
```

Expected: WXT exits with code 0 and writes Firefox output under `.output/`.

- [ ] **Step 6: Refresh codebase-memory index**

Run the codebase-memory MCP `index_repository` tool:

```text
repo_path: /home/alluofuyo/codes/others/locale_proxy_browser_plugin
mode: fast
persistence: true
```

Expected: the project is indexed and `.codebase-memory/graph.db.zst` is refreshed.

- [ ] **Step 7: Commit README and graph artifact**

Run:

```bash
git add README.md .codebase-memory
git commit -m "docs: add usage guide and code graph artifact"
```

Expected: commit succeeds.

---

## Self-Review

Spec coverage:

- WXT + React + TypeScript scaffold is covered by Tasks 1, 5, 6, and 7.
- Chrome, Edge, and Firefox build support is covered by Tasks 1 and 8.
- Popup and options rendering is covered by Tasks 6 and 7.
- Background and content entrypoints are covered by Task 5.
- Shared settings, storage, and typed messages are covered by Tasks 2 and 3.
- Exit IP and geolocation checking is covered by Tasks 4, 5, and 6.
- Unit tests are covered by Tasks 2, 3, 4, and 8.
- README documentation is covered by Task 8.

Completeness scan:

- The plan uses exact file paths, concrete commands, and concrete expected results.
- Every code-writing step includes the code to write.
- No unresolved gaps remain.

Type consistency:

- `RuntimeMessage`, `RuntimeResponse`, `ExtensionSettings`, `EffectiveRule`, and `IpCheckResult` are defined in Task 2 and used consistently in later tasks.
- IP provider functions use `IpCheckProvider`, `checkCurrentExit`, `isIpCheckFresh`, and `getIpCheckProvider` consistently across tests, background, and popup.
