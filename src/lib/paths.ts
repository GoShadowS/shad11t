/**
 * SHADVOID — хелперы путей с учётом base (GitHub Pages: / или /<repo>/).
 * Использовать ВЕЗДЕ вместо хардкода "/about" и т.п.
 */

export const BASE_URL: string =
  (import.meta.env?.BASE_URL as string | undefined) || '/';

function joinBase(path: string): string {
  const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  return base + path.replace(/^\/+/, '');
}

/** Путь к файлу (без слэша в конце): u('projects.json'), u('og-cover.jpg') */
export function u(path: string): string {
  return joinBase(path);
}

/** Путь к странице (со слэшем в конце): pg('about'), pg('projects/my-mod') */
export function pg(path: string): string {
  const url = joinBase(path);
  return url.endsWith('/') ? url : `${url}/`;
}
