/**
 * Shad11t — публикация проектов в репозиторий через GitHub Contents API.
 * Админка коммитит объединённый JSON прямо в main → GitHub Actions пересобирает сайт.
 * Токен (PAT) хранится ТОЛЬКО в sessionStorage/localStorage и отправляется только на api.github.com.
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

function cleanToken(t) {
  return String(t || '').trim().replace(/^['"]|['"]$/g, '');
}

async function ghFetch(url, rawToken, options = {}) {
  const token = cleanToken(rawToken);
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
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Проверка подключения к GitHub и прав токена
 * @param {{owner, repo, token}}
 * @returns {{ok, user, repoAccess, scopes, message}}
 */
export async function testGitHubAuth({ owner = 'GoShadowS', repo = 'shad11t', token }) {
  const t = cleanToken(token);
  if (!t) throw new Error('Введите GitHub Personal Access Token');

  // 1. Проверяем токен через /user или /octocat
  let user = null;
  try {
    user = await ghFetch('https://api.github.com/user', t);
  } catch (err) {
    // Для Fine-Grained токенов /user может вернуть 403, пробуем сразу репозиторий
    if (err.status !== 403 && err.status !== 401) throw err;
    if (err.status === 401) throw new Error('Неверный токен (401 Bad Credentials). Проверьте правильность токена.');
  }

  // 2. Проверяем доступ к репозиторию
  let repoData = null;
  try {
    repoData = await ghFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, t);
  } catch (err) {
    if (err.status === 404) {
      throw new Error(`Репозиторий ${owner}/${repo} не найден или у токена нет к нему доступа.`);
    }
    if (err.status === 403) {
      throw new Error(`У токена нет прав доступа к репозиторию ${owner}/${repo}.`);
    }
    throw err;
  }

  const permissions = repoData.permissions || {};
  const canPush = permissions.push || permissions.admin;

  return {
    ok: true,
    user: user?.login || owner,
    repo: repoData.full_name,
    canPush: Boolean(canPush),
    defaultBranch: repoData.default_branch || 'main',
  };
}

/**
 * @param {{owner, repo, branch, path, token, message}} opts
 * @returns данные созданного коммита
 */
export async function publishToGitHub({ owner, repo, branch = 'main', path = 'src/data/projects.json', token, message }) {
  const t = cleanToken(token);
  if (!owner || !repo) throw new Error('Укажите owner и repo.');
  if (!t) throw new Error('Вставьте Personal Access Token.');
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
    const current = await ghFetch(`${api}?ref=${encodeURIComponent(branch)}`, t);
    sha = current.sha;
  } catch (err) {
    if (err.status !== 404 && !/not found/i.test(String(err.message))) throw err;
    sha = undefined; // файла нет — создадим
  }

  const body = {
    message: message || `content(admin): обновление проектов (${projects.length})`,
    content,
    branch,
    ...(sha ? { sha } : {}),
  };
  return ghFetch(api, t, { method: 'PUT', body: JSON.stringify(body) });
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
  const t = cleanToken(token);
  if (!owner || !repo) throw new Error('Укажите owner и repo.');
  if (!t) throw new Error('Вставьте Personal Access Token.');
  const data = await ghFetch(`${contentsApi(owner, repo, path)}?ref=${encodeURIComponent(branch)}`, t);
  if (data.type !== 'file' || typeof data.content !== 'string') throw new Error('Это не файл.');
  return { sha: data.sha, text: b64decodeUnicode(data.content) };
}

/** Записать текстовый файл в репозиторий (sha нужен, если файл существует). */
export async function writeRepoFile({ owner, repo, branch = 'main', path, token, message, text, sha }) {
  const t = cleanToken(token);
  if (!owner || !repo) throw new Error('Укажите owner и repo.');
  if (!t) throw new Error('Вставьте Personal Access Token.');
  const body = {
    message: message || `content(admin): обновление ${path}`,
    content: b64encodeUnicode(String(text ?? '')),
    branch,
    ...(sha ? { sha } : {}),
  };
  return ghFetch(contentsApi(owner, repo, path), t, { method: 'PUT', body: JSON.stringify(body) });
}

/** Создать публичный Gist-хранилище данных. @returns {{id, user, html_url}} */
export async function createGist({ token, description = 'Shad11t runtime data (projects)' }) {
  const t = cleanToken(token);
  if (!t) throw new Error('Вставьте Personal Access Token.');
  const projects = await mergedForPublish();
  const data = await ghFetch('https://api.github.com/gists', t, {
    method: 'POST',
    body: JSON.stringify({
      description,
      public: true,
      files: { [GIST_FILE]: { content: `${JSON.stringify(projects, null, 2)}\n` } },
    }),
  });
  return { id: data.id, user: data.owner?.login || '', html_url: data.html_url || '' };
}

/** Обновить данные в Gist-хранилище. @returns число проектов */
export async function updateGist({ token, gistId }) {
  const t = cleanToken(token);
  if (!t) throw new Error('Вставьте Personal Access Token.');
  if (!gistId) throw new Error('Gist не подключён.');
  const projects = await mergedForPublish();
  await ghFetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, t, {
    method: 'PATCH',
    body: JSON.stringify({
      files: { [GIST_FILE]: { content: `${JSON.stringify(projects, null, 2)}\n` } },
    }),
  });
  return projects.length;
}
