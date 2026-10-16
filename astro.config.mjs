import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

/**
 * SHADVOID — astro config
 *
 * BASE_PATH / SITE_URL подставляются автоматически в GitHub Actions (.github/workflows/deploy.yml):
 *  - для репозитория <username>.github.io  →  BASE_PATH=/  SITE_URL=https://<username>.github.io
 *  - для обычного репозитория <repo>       →  BASE_PATH=/<repo>/  SITE_URL=https://<username>.github.io/<repo>
 *
 * Локально можно переопределить:  BASE_PATH=/my-repo/ npm run build
 */
const BASE_PATH = process.env.BASE_PATH || '/';
const SITE_URL = process.env.SITE_URL || undefined;

if (!SITE_URL) {
  console.warn(
    '\x1b[33m[shadvoid]\x1b[0m SITE_URL не задан — sitemap.xml и canonical-ссылки будут использовать https://example.com. На GitHub Pages это значение подставляется автоматически.',
  );
}

export default defineConfig({
  site: SITE_URL || 'https://example.com',
  base: BASE_PATH,
  // Всегда /about/ вместо /about — так надёжнее работает на GitHub Pages
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  vite: {
    plugins: [tailwindcss()],
    // dev/preview: разрешаем любые хосты (облачные IDE, туннели). На прод-билд не влияет.
    server: { allowedHosts: true },
    preview: { allowedHosts: true },
    build: {
      // three.js тянем отдельным чанком и только на главной
      chunkSizeWarningLimit: 900,
    },
  },
});
