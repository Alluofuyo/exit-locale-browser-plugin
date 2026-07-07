import react from '@vitejs/plugin-react';
import { defineConfig } from 'wxt';

export default defineConfig({
  vite: () => ({
    plugins: [react()],
  }),
  manifest: (env) => {
    const manifest = {
      name: 'Exit Locale',
      description: 'Inspect current exit IP and apply matching language, timezone, and geolocation spoofing.',
      permissions: ['storage', 'tabs'],
      host_permissions: ['https://ipapi.co/*'],
      action: {
        default_title: 'Exit Locale',
      },
    };

    if (env.browser === 'firefox') {
      return {
        ...manifest,
        browser_specific_settings: {
          gecko: {
            id: 'exit-locale-browser-plugin@example.org',
            data_collection_permissions: {
              required: ['locationInfo'],
            },
          },
        },
      };
    }

    return manifest;
  },
});
