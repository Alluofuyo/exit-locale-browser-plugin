# Browser Extension Framework Design

Date: 2026-07-07

## Goal

Create a maintainable browser extension framework for Chrome, Edge, and Firefox. The first version provides a usable scaffold with React + TypeScript UI, WXT-based cross-browser builds, a modular extension architecture, and a core feature for checking the current exit IP and its geographic location.

The framework should support future proxy, locale, timezone, geolocation, and per-site rule features without coupling those concerns directly to the UI.

## Selected Approach

Use WXT + React + TypeScript.

WXT is selected because the extension must target Chrome, Edge, and Firefox. It handles WebExtension entrypoints, manifest generation, development mode, and production packaging more cleanly than a hand-rolled Vite setup. React is selected for popup and options UI maintainability.

Chrome and Edge will use Manifest V3. Firefox support will use WXT's cross-browser target support, with browser capability differences isolated behind wrapper modules.

## Project Structure

```text
entrypoints/
  background.ts
  content.ts
  popup/
    App.tsx
    main.tsx
    index.html
  options/
    App.tsx
    main.tsx
    index.html
src/
  browser/
  core/
  ip-check/
  storage/
  shared/
```

`entrypoints/background.ts` owns privileged browser API operations, including proxy application, settings synchronization, and exit IP checks.

`entrypoints/content.ts` owns page-side behavior. It requests effective site rules from the background service and will later support page environment overrides such as language, timezone, and geolocation injection.

`entrypoints/popup/` contains the compact React UI for current status, enabled state, active rule, current exit IP, and manual refresh actions.

`entrypoints/options/` contains the full React configuration UI for profiles, site rules, provider settings, and advanced options.

`src/browser/` wraps WebExtension APIs and normalizes Chrome, Edge, and Firefox differences.

`src/core/` contains UI-independent logic: settings models, rule matching, proxy profile selection, locale profile selection, and effective configuration resolution.

`src/ip-check/` contains the exit IP and geolocation provider interface, default provider implementation, result normalization, timeout handling, and cache policy.

`src/storage/` contains typed settings persistence, default values, migration hooks, and schema validation.

`src/shared/` contains shared types, constants, message contracts, and utility functions used across entrypoints.

## Core Data Model

The framework starts with these concepts:

- `ProxyProfile`: a named proxy mode or node configuration.
- `LocaleProfile`: language, timezone, and geolocation preference settings.
- `SiteRule`: hostname-based matching rules that select proxy and locale profiles.
- `ExtensionSettings`: the complete persisted configuration, including global enabled state, default profiles, rules, and IP check settings.
- `EffectiveRule`: the resolved behavior for a specific URL.
- `IpCheckResult`: normalized current exit IP, country, region, city, ISP, ASN, timezone, provider, timestamp, and status.

Settings are persisted in `browser.storage.local`. Storage reads validate shape and fall back to defaults if stored data is missing or invalid.

## Message Contracts

Popup, options, content, and background communicate through typed runtime messages instead of ad hoc string payloads.

Initial messages:

- `PING`: health check for runtime messaging.
- `GET_SETTINGS`: read current extension settings.
- `SAVE_SETTINGS`: persist updated extension settings.
- `GET_EFFECTIVE_RULE`: resolve active behavior for a URL.
- `CHECK_CURRENT_EXIT`: run or retrieve the current exit IP check.
- `GET_LAST_EXIT_CHECK`: read the cached exit IP check result.

The background service is the authority for privileged actions. Popup and options request actions through typed messages. Content scripts request effective rules and only perform page-side behavior.

## Exit IP And Geolocation Check

The first version includes a visible exit IP feature.

`src/ip-check/` exposes:

- `getCurrentIp()`: fetch the current public exit IP through a provider.
- `getIpGeoLocation(ip)`: fetch geolocation details for an IP when the provider requires separate calls.
- `checkCurrentExit()`: return a normalized `IpCheckResult` for the current network path.

The provider layer is replaceable. The framework ships with one default free public API provider so the feature works immediately. Provider configuration includes provider ID, timeout, cache TTL, and automatic refresh behavior.

The background service performs IP check requests, not content scripts. This avoids page CSP issues and keeps external API behavior centralized.

Popup displays:

- current public IP
- country or region
- city when available
- ISP or ASN when available
- last check time
- check status
- manual refresh button

If proxy support is enabled, popup should show both the configured proxy state and the measured exit result so users can tell whether the proxy is actually taking effect.

Options provides provider and refresh configuration. Automatic refresh is conservative by default to avoid rate limits.

## Data Flow

User settings flow:

1. User changes settings in popup or options.
2. UI sends `SAVE_SETTINGS` to background.
3. Background validates and persists settings through `src/storage`.
4. Background applies runtime side effects such as proxy settings.
5. Other extension views read updated settings through `GET_SETTINGS`.

Page rule flow:

1. Content script loads on a page.
2. Content script sends `GET_EFFECTIVE_RULE` with the current URL.
3. Background loads settings and resolves the matching site rule through `src/core`.
4. Background returns the effective rule.
5. Content script applies only page-side behavior.

Exit IP flow:

1. Popup sends `CHECK_CURRENT_EXIT` when opened or when refresh is clicked.
2. Background checks cache freshness.
3. Background calls `src/ip-check` when the cache is stale or refresh is forced.
4. Result is normalized and stored in `browser.storage.local`.
5. Popup renders the normalized result.

When proxy settings change, background marks the cached IP result stale so UI can prompt or trigger a fresh check.

## Error Handling

`src/browser/` normalizes browser API failures, including `chrome.runtime.lastError` style errors.

`src/storage/` validates settings and falls back to default configuration if persisted data is corrupted or incompatible with the current schema.

Background operations report structured statuses instead of throwing raw errors across message boundaries.

IP check failures return an `IpCheckResult` with a failure status, provider ID, timestamp, and user-displayable reason. Network timeout, rate limit, invalid provider response, and unsupported provider are distinct failure cases.

Content scripts fail open. If page-side injection or rule resolution fails, the web page should continue loading and the error should be reported to background.

Browser-specific capabilities are detected at runtime. Unsupported behavior returns capability status rather than silently pretending to work.

## Testing Strategy

Use Vitest for the first testing layer.

Initial unit tests cover:

- hostname and site rule matching
- default settings creation and settings merge behavior
- storage validation and fallback behavior
- message contract helpers
- IP check provider success, timeout, invalid response, and network failure cases
- `IpCheckResult` normalization

Browser API wrapper tests use mocks so core behavior can run in Node.

Build verification must cover at least Chrome and Firefox targets. Edge is expected to share the Chrome build path unless a later compatibility issue requires a separate target.

React UI tests are optional for the initial scaffold. Add React Testing Library once popup or options behavior becomes complex enough to justify component-level assertions.

## Non-Goals For The First Scaffold

The first scaffold does not need to implement a complete proxy marketplace, paid provider integration, account login, cloud sync, or advanced anti-fingerprinting guarantees.

IP geolocation is a diagnostic feature. It should help users understand the visible exit route, but it is not treated as a security proof.

## Acceptance Criteria

The scaffold is complete when:

- a WXT + React + TypeScript extension project exists
- Chrome and Firefox builds can be generated
- popup and options entrypoints render
- background and content entrypoints exist
- shared settings, storage, and typed message modules exist
- exit IP and geolocation checking works through a background-owned provider interface
- popup displays the latest normalized exit IP result
- unit tests cover core rule, storage, message, and IP check logic
- README documents development, build, and browser loading commands
