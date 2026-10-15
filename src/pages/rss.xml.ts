/**
 * SHADVOID — GET /rss.xml: лента проектов.
 */
import site from '../data/site.json';
import projectsData from '../data/projects.json';
import { categoryLabel } from '../lib/format';

function xml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function GET({ site: astroSite }: { site?: URL }) {
  const base = (astroSite?.toString() ?? 'https://example.com/').replace(/\/$/, '');
  const projects = (
    projectsData.filter((p) => p && (p as { id?: string }).id) as {
      id: string; title: string; description: string; category: string; date?: string;
    }[]
  ).sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const items = projects
    .map((p) => {
      const link = `${base}/projects/${encodeURIComponent(p.id)}/`;
      const pub = p.date ? new Date(`${p.date}T00:00:00Z`).toUTCString() : new Date().toUTCString();
      return `    <item>
      <title>${xml(p.title)}</title>
      <link>${xml(link)}</link>
      <guid>${xml(link)}</guid>
      <pubDate>${pub}</pubDate>
      <category>${xml(categoryLabel(p.category))}</category>
      <description>${xml(p.description.split('\n')[0] || '')}</description>
    </item>`;
    })
    .join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${xml(`${site.name} — проекты`)}</title>
    <link>${xml(`${base}/`)}</link>
    <description>${xml(site.description)}</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(rss, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
