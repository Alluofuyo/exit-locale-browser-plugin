# Privacy

Exit Locale checks the current network exit IP by requesting `https://ipapi.co/json/`. If that provider fails, it falls back to `https://ipwho.is/`.

The response is used to show the current exit IP, infer a matching language, timezone, and approximate geolocation, and save that recommendation locally when you apply it. Settings are stored in the browser extension storage area on your device.

The extension does not run a proxy, does not collect browsing history, and does not send profile settings to a custom server.
