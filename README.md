# Locale Proxy Browser Plugin

WXT + React + TypeScript browser extension scaffold for Chrome, Edge, and Firefox.

## Features

- React popup and options pages
- Background service for privileged extension actions
- Content script scaffold for page-side behavior
- Typed settings, messages, and rule matching
- Current exit IP and geolocation check through a replaceable provider interface
- Vitest coverage for core logic

The default exit IP provider contacts `https://ipapi.co/json/`. That provider can observe the network exit IP used for the request.

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
