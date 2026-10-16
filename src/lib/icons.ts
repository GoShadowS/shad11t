/**
 * Shad11t — серверный рендер иконок в SVG-строки (ноль клиентского JS).
 *  - Контурные иконки: Lucide (экспортятся напрямую как IconNode-массивы)
 *  - Бренды: simple-icons (YouTube / Telegram / Boosty / GitHub)
 *
 * Использование в Astro: <Icon name="Terminal" class="w-5 h-5" />
 * Бренды: <Icon name="brand:youtube" />, "brand:telegram", "brand:boosty", "brand:github"
 */
import * as lucide from 'lucide';
import { siYoutube, siTelegram, siBoosty, siGithub } from 'simple-icons';

type IconNode = Array<[tag: string, attrs: Record<string, string | number>]>;

const BRANDS: Record<string, { path: string; title: string }> = {
  youtube: { path: siYoutube.path, title: siYoutube.title },
  telegram: { path: siTelegram.path, title: siTelegram.title },
  boosty: { path: siBoosty.path, title: siBoosty.title },
  github: { path: siGithub.path, title: siGithub.title },
};

function escapeAttr(v: string | number): string {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function nodeToSvg(node: IconNode): string {
  return node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs ?? {})
        .map(([k, v]) => `${k}="${escapeAttr(v)}"`)
        .join(' ');
      return `<${tag} ${a}/>`;
    })
    .join('');
}

/** Контурная иконка Lucide по имени (PascalCase, напр. "Terminal", "Gamepad2"). */
export function lucideSvg(name: string, cls = ''): string {
  const node = (lucide as unknown as Record<string, IconNode>)[name];
  if (!node || !Array.isArray(node)) {
    // Если имя совпадает с брендом без префикса (напр. "Github"), отдаём бренд
    if (BRANDS[name.toLowerCase()]) {
      return brandSvg(name.toLowerCase(), cls);
    }
    // заглушка, чтобы верстка не ломалась при опечатке
    return `<svg class="${escapeAttr(cls)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9l6 6M15 9l-6 6"/></svg>`;
  }
  return `<svg class="${escapeAttr(cls)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${nodeToSvg(node)}</svg>`;
}

/** Бренд-иконка (заливка currentColor). */
export function brandSvg(name: string, cls = ''): string {
  const b = BRANDS[name.toLowerCase()];
  if (!b) return lucideSvg('Hexagon', cls);
  return `<svg class="${escapeAttr(cls)}" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="${escapeAttr(b.title)}"><path d="${escapeAttr(b.path)}"/></svg>`;
}

/** Универсальный рендер: "Terminal" или "brand:youtube". */
export function icon(name: string, cls = ''): string {
  if (name.startsWith('brand:')) return brandSvg(name.slice(6), cls);
  if (BRANDS[name.toLowerCase()]) return brandSvg(name.toLowerCase(), cls);
  return lucideSvg(name, cls);
}
