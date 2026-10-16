/**
 * SHADVOID — публикация проектов в репозиторий через GitHub Contents API.
 * Админка коммитит объединённый JSON прямо в main → GitHub Actions пересобирает сайт.
 * Токен (PAT) хранится ТОЛЬКО в sessionStorage и никуда кроме api.github.com не отправляется.
 */

import { mergedForPublish } from './store.js';
import { GIST_FILE } from './utils.js';

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

function contentsApi(owner, repo, path) {
  const cleanPath = String(path).replace(/^\/+/, '');
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${cleanPath
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

function b64decodeUnicode(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Прочитать текстовый файл из репозитория. @returns {{sha, text}} */
export async function readRepoFile({ owner, repo, branch = 'main', path, token }) {
  if (!owner || !repo) throw new Error('Укажите owner и repo.');
  if (!token) throw new Error('Вставьте Personal Access Token.');
  const data = await ghFetch(`${contentsApi(owner, repo, path)}?ref=${encodeURIComponent(branch)}`, token);
  if (data.type !== 'file' || typeof data.content !== 'string') throw new Error('Это не файл.');
  return { sha: data.sha, text: b64decodeUnicode(data.content) };
}

/** Записать текстовый файл в репозиторий (sha нужен, если файл существует). */
export async function writeRepoFile({ owner, repo, branch = 'main', path, token, message, text, sha }) {
  if (!owner || !repo) throw new Error('Укажите owner и repo.');
  if (!token) throw new Error('Вставьте Personal Access Token.');
  const body = {
    message: message || `content(admin): обновление ${path}`,
    content: b64encodeUnicode(String(text ?? '')),
    branch,
    ...(sha ? { sha } : {}),
  };
  return ghFetch(contentsApi(owner, repo, path), token, { method: 'PUT', body: JSON.stringify(body) });
}

/** Создать публичный Gist-хранилище данных. @returns {{id, user, html_url}} */
export async function createGist({ token, description = 'SHADVOID runtime data (projects)' }) {
  if (!token) throw new Error('Вставьте Personal Access Token.');
  const projects = await mergedForPublish();
  const data = await ghFetch('https://api.github.com/gists', token, {
    method: 'POST',
    body: JSON.stringify({
      description,
      public: true,
      files: { [GIST_FILE]: { content: `${JSON.stringify(projects, null, 2)}\n` } },
    }),
  });
  return { id: data.id, user: data.owner?.login || '', html_url: data.html_url || '' };
}

/** Обновить данные в Gist-хранилище. Мгновенно видно всему сайту. @returns число проектов */
export async function updateGist({ token, gistId }) {
  if (!token) throw new Error('Вставьте Personal Access Token.');
  if (!gistId) throw new Error('Gist не подключён.');
  const projects = await mergedForPublish();
  await ghFetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      files: { [GIST_FILE]: { content: `${JSON.stringify(projects, null, 2)}\n` } },
    }),
  });
  return projects.length;
}
