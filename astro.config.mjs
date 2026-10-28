import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({
  site: 'https://alr5342.github.io',
  base: '/ALR-X-Men-Universe',
  integrations: [react()],
  output: 'static',
  devToolbar: { enabled: false },
});
