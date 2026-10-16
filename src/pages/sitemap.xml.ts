/**
 * SHADVOID — GET /sitemap.xml: статичные страницы + страницы проектов.
 * Хост подставляется из SITE_URL при сборке (см. astro.config.mjs).
 */
import projectsData from '../data/projects.json';

export function GET({ site: astroSite }: { site?: URL }) {
  const base = (astroSite?.toString() ?? 'https://example.com/').replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);
  const pages = ['', 'about/', 'projects/', 'content/', 'contact/'];
  const projects = projectsData.filter((p) => p && (p as { id?: string }).id) as { id: string; date?: string }[];

  const urls = [
    ...pages.map((p) => ({ loc: `${base}/${p}`, lastmod: today })),
    ...projects.map((p) => ({
      loc: `${base}/projects/${encodeURIComponent(p.id)}/`,
      lastmod: p.date || today,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
