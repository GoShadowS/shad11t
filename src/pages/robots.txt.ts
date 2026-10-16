/**
 * Shad11t — GET /robots.txt: закрываем админку и черновики от поисковиков.
 */
export function GET({ site: astroSite }: { site?: URL }) {
  const base = (astroSite?.toString() ?? 'https://example.com/').replace(/\/$/, '');
  const root = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const body = `User-agent: *
Allow: ${root || '/'}
Disallow: ${root}/admin/
Disallow: ${root}/project

Sitemap: ${base}/sitemap.xml
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
