// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The production domain has not been confirmed by the client yet.
// Set SITE_URL at build time (e.g. SITE_URL=https://www.your-domain.qa npm run build).
const site = process.env.SITE_URL ?? 'https://nexora.example';

// https://astro.build/config
export default defineConfig({
  site,
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: {
    // Small CSS is inlined to avoid a render-blocking request before the hero paints.
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // Hero and interaction modules are hand-written and small; keep them readable in devtools.
      cssMinify: true,
    },
  },
});
