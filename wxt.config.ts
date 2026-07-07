import react from '@vitejs/plugin-react';
import { defineConfig } from 'wxt';

export default defineConfig({
  vite: () => ({
    plugins: [react()],
  }),
  manifest: (env) => {
    const manifest = {
      name: 'Locale Proxy Browser Plugin',
      description: 'Inspect current exit IP and prepare browser proxy and locale rules.',
      permissions: ['storage', 'tabs'],
      host_permissions: ['https://ipapi.co/*'],
      action: {
        default_title: 'Locale Proxy',
      },
    };

    if (env.browser === 'firefox') {
      return {
        ...manifest,
        browser_specific_settings: {
          gecko: {
            id: 'locale-proxy-browser-plugin@example.org',
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
