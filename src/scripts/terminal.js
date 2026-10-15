/**
 * SHADVOID — интерактивный терминал: boot-лог, команды, история.
 * Несколько экземпляров на странице поддерживаются (data-terminal).
 */

import { $$, esc, pg } from './utils.js';
import { loadProjects } from './store.js';
import { sfx } from './audio.js';
import site from '../data/site.json';

const BOOT = [
  ['shadvoid shell v1.1 — каждая тень начинается со света', 't-dim'],
  ['печатай <span class="t-phos font-bold">help</span>, чтобы увидеть команды', 't-dim'],
];

const CMDS = ['help', 'whoami', 'about', 'projects', 'skills', 'socials', 'open', 'date', 'echo', 'ls', 'cd', 'cat', 'pwd', 'uname', 'sudo', 'rm', 'clear', 'konami', 'exit'];

function helpHTML() {
  const rows = [
    ['help', 'этот список'],
    ['about', 'кто такой Shad11t'],
    ['projects', 'последние проекты'],
    ['skills', 'стек технологий'],
    ['socials', 'где меня найти'],
    ['open &lt;name&gt;', 'открыть: youtube / telegram / boosty / github'],
    ['ls / cd / cat', 'осмотреться в теневой ФС'],
    ['date', 'который час в тени'],
    ['konami', 'подсказка про пасхалку'],
    ['sudo', 'попробуй. рискни'],
    ['clear', 'очистить экран'],
  ];
  return rows.map(([c, d]) => `<div><span class="t-phos font-bold w-40 inline-block">${c}</span><span class="t-dim">${esc(d)}</span></div>`).join('');
}

function aboutHTML() {
  return [
    '<span class="t-phos font-bold">Shad11t</span> — YouTube-блогер и программист.',
    'Днём пишу <span class="t-gold">моды для Minecraft</span>, приложения и ботов.',
    'Ночью превращаю это в контент на канале.',
    `База: <a class="t-phos underline" href="${pg('about')}">/about</a> · Проекты: <a class="t-phos underline" href="${pg('projects')}">/projects</a>`,
  ].join('<br>');
}

function skillsHTML() {
  const bars = (n) => '▰'.repeat(n) + '<span class="t-dim">' + '▱'.repeat(10 - n) + '</span>';
  return [
    `Java/Forge   ${bars(9)} <span class="t-phos">дом родной</span>`,
    `JavaScript   ${bars(8)}`,
    `Python       ${bars(8)}`,
    `Tauri/Rust   ${bars(7)}`,
    `Flutter      ${bars(6)}`,
    `Монтаж       ${bars(7)}`,
  ].join('<br>');
}

function socialsHTML() {
  const s = site.socials;
  const row = (name, url) => `<div><span class="t-dim">→</span> <a class="t-phos underline" href="${esc(url)}" target="_blank" rel="noopener">${name}</a> <span class="t-dim">${esc(url.replace('https://', ''))}</span></div>`;
  return row('youtube', s.youtube) + row('telegram', s.telegram) + row('boosty', s.boosty) + row('github', s.github);
}

async function projectsHTML() {
  try {
    const { projects } = await loadProjects();
    const top = projects.slice(0, 6);
    if (!top.length) return '<span class="t-ember">проектов пока нет. тени пусты…</span>';
    return top.map((p, i) => {
      const num = String(i + 1).padStart(2, '0');
      return `<div><span class="t-dim">${num}</span> <a class="t-bone font-bold underline decoration-phos/50 hover:text-phos" href="${pg(`projects/${encodeURIComponent(p.id)}`)}">${esc(p.title)}</a> <span class="t-dim">[${esc(p.category)}]</span></div>`;
    }).join('') + `<div class="t-dim mt-1">все → <a class="t-phos underline" href="${pg('projects')}">/projects</a></div>`;
  } catch {
    return '<span class="t-ember">ошибка загрузки projects.json</span>';
  }
}

export function initTerminal() {
  const terms = $$('[data-terminal]');
  if (!terms.length) return () => {};
  const cleanups = terms.map((root) => {
    const out = root.querySelector('[data-term-out]');
    const form = root.querySelector('[data-term-form]');
    const input = root.querySelector('[data-term-in]');
    if (!out || !form || !input) return () => {};
    const local = [];
    const history = [];
    let hIndex = -1;
    let booted = false;

    const scrollDown = () => {
      out.scrollTop = out.scrollHeight;
    };
    const print = (html, cls = '') => {
      const div = document.createElement('div');
      if (cls) div.className = cls;
      div.innerHTML = html;
      out.appendChild(div);
      scrollDown();
    };
    const printCmd = (cmd) => {
      print(`<span class="t-phos font-bold">➜ ~</span> <span class="t-bone">${esc(cmd)}</span>`);
    };

    async function exec(raw) {
      const cmd = raw.trim();
      if (!cmd) return;
      printCmd(cmd);
      history.unshift(cmd);
      hIndex = -1;
      const [name, ...args] = cmd.split(/\s+/);
      const arg = args.join(' ');
      const low = name.toLowerCase();

      switch (low) {
        case 'help': print(helpHTML()); break;
        case 'whoami': print('<span class="t-phos font-bold">shad11t_the_shadow</span> <span class="t-dim">(uid=11, gid=shadow)</span>'); break;
        case 'about': print(aboutHTML()); break;
        case 'projects': print('<span class="t-dim">читаю projects.json…</span>'); print(await projectsHTML()); break;
        case 'skills': print(skillsHTML()); break;
        case 'socials': print(socialsHTML()); break;
        case 'open': {
          const map = { youtube: site.socials.youtube, yt: site.socials.youtube, telegram: site.socials.telegram, tg: site.socials.telegram, boosty: site.socials.boosty, github: site.socials.github, gh: site.socials.github };
          const key = arg.toLowerCase();
          if (map[key]) {
            print(`<span class="t-phos">открываю ${esc(key)} в новой вкладке…</span>`);
            window.open(map[key], '_blank', 'noopener');
          } else {
            print('<span class="t-ember">что открыть? называй: youtube / telegram / boosty / github</span>');
          }
          break;
        }
        case 'date': print(new Date().toLocaleString('ru-RU', { dateStyle: 'full', timeStyle: 'short' })); break;
        case 'echo': print(esc(arg) || '<span class="t-dim">…</span>'); break;
        case 'pwd': print('/home/shad11t/shadow'); break;
        case 'uname': print('SHADVOID_OS void-1.1 x86_64 Shadow_Kernel'); break;
        case 'ls':
          print('drwxr-xr-x <span class="t-phos font-bold">projects</span>   drwxr-xr-x <span class="t-phos font-bold">videos</span>   drwx------ <span class="t-ember font-bold">secrets</span>   -rw-r--r-- readme.txt');
          break;
        case 'cd':
          if (!arg || arg === '~' || arg === '/home/shad11t/shadow') print('<span class="t-dim">ты уже дома. в тени.</span>');
          else if (arg === 'secrets' || arg.startsWith('secrets')) print('<span class="t-ember">cd: secrets: Отказано в доступе. Тень всё видит.</span>');
          else if (arg === 'projects' || arg === 'videos') print(`<span class="t-dim">ты в ${esc(arg)}. но смотреть лучше тут:</span> <a class="t-phos underline" href="${pg(arg === 'videos' ? 'content' : 'projects')}">/${arg === 'videos' ? 'content' : 'projects'}</a>`);
          else if (arg === '..') print('<span class="t-dim">наверх нельзя. свет слепит.</span>');
          else print(`<span class="t-ember">cd: ${esc(arg)}: Нет такой тени</span>`);
          break;
        case 'cat':
          if (/secret/i.test(arg)) print('<span class="t-ember">cat: Доступ запрещён. Хорошая попытка.</span>');
          else if (!arg) print('<span class="t-dim">cat: что читаем?</span>');
          else print(`<span class="t-ember">cat: ${esc(arg)}: Нет такого файла. Попробуй «ls».</span>`);
          break;
        case 'sudo':
          print('<span class="t-ember font-bold">shad11t отсутствует в файле sudoers. Данный инцидент будет доложен тени.</span>');
          try { sfx('error'); } catch { /* ignore */ }
          break;
        case 'rm':
          print('<span class="t-ember">rm: невозможно удалить «/dev/shadow»: Тень вечна.</span>');
          break;
        case 'konami':
          print('набери на клавиатуре: <span class="t-phos font-bold">↑ ↑ ↓ ↓ ← → ← → B A</span>');
          break;
        case 'clear':
          out.innerHTML = '';
          break;
        case 'exit':
        case 'quit':
        case 'logout':
          print('<span class="t-ember">отсюда не выходят. тени держат крепко :)</span>');
          break;
        case 'matrix':
          print('<span class="t-dim">тут нет матрицы. тут только тени. и они круче.</span>');
          break;
        default:
          print(`<span class="t-ember">команда не найдена: ${esc(name)}</span> <span class="t-dim">— напиши «help»</span>`);
      }
    }

    const onSubmit = (e) => {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      exec(v);
      try { sfx('key'); } catch { /* ignore */ }
    };
    const onKey = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (hIndex < history.length - 1) {
          hIndex += 1;
          input.value = history[hIndex] ?? '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (hIndex > 0) {
          hIndex -= 1;
          input.value = history[hIndex] ?? '';
        } else {
          hIndex = -1;
          input.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const v = input.value.toLowerCase();
        if (!v) return;
        const hit = CMDS.find((c) => c.startsWith(v));
        if (hit) input.value = hit;
      }
    };
    const onClick = () => {
      if (window.getSelection()?.toString()) return;
      input.focus({ preventScroll: true });
    };

    form.addEventListener('submit', onSubmit);
    input.addEventListener('keydown', onKey);
    root.addEventListener('click', onClick);
    local.push(() => {
      form.removeEventListener('submit', onSubmit);
      input.removeEventListener('keydown', onKey);
      root.removeEventListener('click', onClick);
    });

    // boot при появлении в видимости
    const io = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || booted) return;
      booted = true;
      BOOT.forEach(([html, cls], i) => {
        setTimeout(() => print(html, cls), 150 + i * 260);
      });
      io.disconnect();
    }, { threshold: 0.25 });
    io.observe(root);
    local.push(() => io.disconnect());

    return () => local.forEach((fn) => fn());
  });

  // кнопки-быстрые команды [data-cmd]: печатают команду в первый терминал
  const chips = $$('[data-cmd]');
  const chipCleanups = chips.map((chip) => {
    const onClick = () => {
      const target = document.querySelector('[data-terminal]');
      const input = target?.querySelector('[data-term-in]');
      const form = target?.querySelector('[data-term-form]');
      if (!target || !input || !form) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        input.value = chip.dataset.cmd || '';
        form.requestSubmit();
        input.focus({ preventScroll: true });
      }, 350);
    };
    chip.addEventListener('click', onClick);
    return () => chip.removeEventListener('click', onClick);
  });

  return () => {
    cleanups.forEach((fn) => fn());
    chipCleanups.forEach((fn) => fn());
  };
}
