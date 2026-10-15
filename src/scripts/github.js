/**
 * SHADVOID — публикация проектов в репозиторий через GitHub Contents API.
 * Админка коммитит объединённый JSON прямо в main → GitHub Actions пересобирает сайт.
 * Токен (PAT) хранится ТОЛЬКО в sessionStorage и никуда кроме api.github.com не отправляется.
 */

import { mergedForPublish } from './store.js';

function b64encodeUnicode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

async function ghFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/**
 * @param {{owner, repo, branch, path, token, message}} opts
 * @returns данные созданного коммита
 */
export async function publishToGitHub({ owner, repo, branch = 'main', path = 'src/data/projects.json', token, message }) {
  if (!owner || !repo) throw new Error('Укажите owner и repo.');
  if (!token) throw new Error('Вставьте Personal Access Token.');
  const cleanPath = String(path).replace(/^\/+/, '');
  const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${cleanPath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  const projects = await mergedForPublish();
  const content = b64encodeUnicode(`${JSON.stringify(projects, null, 2)}\n`);

  // нужен ли sha? (файл уже существует)
  let sha;
  try {
    const current = await ghFetch(`${api}?ref=${encodeURIComponent(branch)}`, token);
    sha = current.sha;
  } catch (err) {
    if (!/not found/i.test(String(err.message))) throw err;
    sha = undefined; // файла нет — создадим
  }

  const body = {
    message: message || `content(admin): обновление проектов (${projects.length})`,
    content,
    branch,
    ...(sha ? { sha } : {}),
  };
  return ghFetch(api, token, { method: 'PUT', body: JSON.stringify(body) });
}
