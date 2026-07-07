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
