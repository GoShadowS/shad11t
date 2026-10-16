# SHADVOID_ — теневая лаборатория Shad11t

Личное портфолио + визитка + витрина проектов: моды для Minecraft, десктопные и мобильные приложения, плагины, боты, скрипты — и YouTube-контент обо всём этом. Статический многостраничный сайт для **GitHub Pages** с админ-панелью, плавными переходами между страницами и дизайном уровня «вау, кто это сделал?».

---

## 🏷️ Название сайта

Основной вариант (используется в коде, title, meta-тегах и шапке):

| # | Название | Смысл |
|---|----------|-------|
| **1** | **SHADVOID** ✅ | `SHAD11t + VOID` — «теневая пустота». Коротко, брендово, легко гуглится, свободен от клише |
| 2 | `SHADOWCRAFT_` | Прямая отсылка к Minecraft + «крафт» кода. Минус: похоже на сотни фанатских проектов |
| 3 | `SHAD11T://OS` | Хакерская «теневая ОС». Круто, но хуже читается и запоминается |

Теглайн: **«теневая лаборатория»** · палитра: глубокий чёрный + фосфорный лайм + ember-оранжевый + кость.

---

## ✨ Что умеет сайт

**Страницы:** Главная · Проекты (фильтры, поиск, сортировка, кейсы) · Обо мне (таймлайн, орбита навыков) · Контент (видео) · Контакты (порталы + форма-сигнал + FAQ) · скрытая **/admin** · 404 в стиле Minecraft.

**Дизайн и моушн:**
- Прелоадер «загрузка теневой ОС», кастомный курсор с режимами (кольцо / лупа с текстом), пиксельный шлейф за курсором
- Hero на **Three.js**: рой из 600+ частиц, разбегающихся от мыши (шейдер, отдельный чанк — грузится только на главной)
- «Фонарик»: скрытый слой hero проявляется только под курсором
- Плавные переходы между страницами (View Transitions API + `ClientRouter`), Lenis smooth scroll, GSAP ScrollTrigger: пословные манифесты, параллакс, пинned-горизонтальная витрина, счётчики, XP-бары
- 3D-tilt карточек с бликом за курсором, магнитные кнопки, WebAudio-микрозвуки с кнопкой mute
- Интерактивный терминал (команды `help`, `projects`, `skills`, `socials`, `open`, `sudo`…), Konami Code → крипер + «Achievement Get!», клик ×5 по логотипу, секрет в консоли
- Процедурные обложки: у каждого проекта без картинки — уникальная seeded-обложка в стиле сайта (canvas, без единой скачанной картинки)
- Уважение к `prefers-reduced-motion` и тач-устройствам (тяжёлые эффекты отключаются)

**Техника:**
- SEO: meta/OG/Twitter, canonical, JSON-LD (Person + WebSite), `sitemap.xml`, `robots.txt`, `rss.xml` проектов, PWA-манифест, favicon, семантика, lazy-loading
- **Админ-панель** (`/admin`, noindex): вход для одного админа → CRUD проектов, порядок, импорт/экспорт JSON, **публикация в репозиторий через GitHub API** (PAT), смена пароля
- Данные: `src/data/projects.json` → собирается в `/projects.json` → клиент объединяет с localStorage-оверлеем правок

---

## 🧰 Стек и почему именно он

| Слой | Выбор | Почему |
|------|-------|--------|
| Фреймворк | **Astro 7** (static) | MPA из коробки — а нам нужны именно отдельные страницы с SEO. Ноль JS по умолчанию, острова интерактивности, `ClientRouter` для SPA-переходов, идеальный статический билд для GH Pages. Next/Nuxt — избыточны (тащат серверную философию), чистый HTML — проигрывает в поддержке и сборке |
| Стили | **Tailwind CSS v4** | Токены темы, скорость, tree-shaking. Кастомный CSS — только для фирменных эффектов |
| Анимации | **GSAP + ScrollTrigger**, **Lenis** | Индустриальный стандарт motion-дизайна + лучший smooth scroll |
| 3D/частицы | **Three.js** (шейдер) | Максимум вау-эффекта, ленивая загрузка одним чанком |
| Иконки | **Lucide** + **simple-icons** (бренды) | Lucide убрал бренды — YouTube/Telegram/Boosty/GitHub берём из simple-icons. Всё рендерится в SVG на сервере, ноль клиентского JS |
| Шрифты | Unbounded + Manrope + JetBrains Mono | Дисплейный гротеск + текст + моно. Все с кириллицей |

---

## 🚀 Запуск и деплой (пошагово)

### Шаг 0. Как назвать репозиторий

Есть два варианта — workflow поддерживает **оба автоматически**:

- **Рекомендую:** `<твой-username>.github.io` (например, `GoShadowS.github.io`) → сайт будет на `https://GoShadowS.github.io/`
- Либо обычное имя (например, `shad11t_the_shadow`) → сайт будет на `https://GoShadowS.github.io/shad11t_the_shadow/`

Ничего настраивать в коде не надо: workflow сам определяет тип репозитория и подставляет `BASE_PATH`/`SITE_URL`.

### Шаг 1. Заливка файлов

```bash
# в папке проекта:
git init
git add .
git commit -m "feat: SHADVOID — первый релиз из тени"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

### Шаг 2. Включение Pages (один раз)

GitHub → твой репозиторий → **Settings → Pages** → **Source: `GitHub Actions`** → Save.

### Шаг 3. Готово

После каждого `git push` в `main` сайт пересобирается и деплоится за ~1–2 минуты. Статус видно во вкладке **Actions**.

### Локальная разработка

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # статический билд в ./dist
npm run preview  # проверка билда локально
```

---

## 🗂️ Структура проекта

```
├── .github/workflows/deploy.yml   # сборка + деплой на Pages при пуше в main
├── public/                        # статика: favicon, manifest, og-cover
├── scripts/hash-password.mjs      # генератор хеша пароля админки
├── src/
│   ├── components/                # Nav, Footer, Terminal, ProjectCard, …
│   ├── data/                      # site.json, projects.json, videos.json, skills.json, admin.json
│   ├── layouts/Base.astro         # общий каркас страниц
│   ├── lib/                       # paths (base-пути), format, icons (SSR SVG)
│   ├── pages/                     # index, about, projects, projects/[slug],
│   │                              # project (черновики), content, contact, admin, 404,
│   │                              # projects.json.ts, rss.xml.ts, sitemap.xml.ts, robots.txt.ts
│   ├── scripts/                   # клиент: main, store, covers, hero(3D), orbit,
│   │                              # terminal, konami, admin, github, … (+ sha256.js)
│   └── styles/global.css          # дизайн-система «toxic void»
├── astro.config.mjs               # base/site из env, tailwind-плагин
├── LICENSE                        # CC BY-NC-ND 4.0
└── README.md
```

---

## 🛠️ Админ-панель (`/admin`)

Ссылки в меню нет — адрес знаешь только ты (и тот, кто читает README).

- **Вход:** логин `shad11t`, пароль по умолчанию `shadow-admin-11` — **смени сразу** (вкладка «Безопасность» или `npm run hash-password -- <новый-пароль>` → вставить в `src/data/admin.json` → push).
- Пароль нигде не хранится в открытом виде: только соль + SHA-256 × 25000. Сессия живёт 12 часов.
- **Проекты:** добавление / редактирование / удаление / ★ топ — всё сохраняется в localStorage и мгновенно видно на сайте (помечается бейджами «new/edited»).
- **Порядок:** стрелки двигают проекты, сохраняется сразу.
- **Публикация:** вставь GitHub username/repo + Personal Access Token (Settings → Developer settings → Tokens (classic), scope `repo`) → «Опубликовать» коммитит `src/data/projects.json` в `main` → Actions пересобирает сайт. Без токена — скачай JSON и закоммить руками.
- Честно: это статика без бэкенда — хеш виден в исходниках, так что пароль защищает от любопытных, а не от целенаправленного взлома. Секреты в админке не храни.

Структура проекта в JSON — классическая: `id, title, description, category (mod|app|mobile-app|other), image (можно пусто — будет автогенерация), link, tags[], date, featured`.

---

## 🎨 Кастомизация

| Что поменять | Где |
|--------------|-----|
| Имя, слоган, соцсети, описание | `src/data/site.json` |
| Проекты | `/admin` или `src/data/projects.json` |
| Видео (вставь свои YouTube ID — превью подтянутся сами) | `src/data/videos.json` |
| Навыки (орбита + бары) | `src/data/skills.json` |
| Цвета и шрифты | `src/styles/global.css` → `@theme` |
| OG-картинка для репостов | `public/og-cover.jpg` |

---

## 🥚 Пасхалки

- `↑ ↑ ↓ ↓ ← → ← → B A` — крипер и ачивка
- Клик ×5 по логотипу — party mode
- `sudo` в терминале — рискни
- Открой консоль браузера (F12)
- Води курсором по hero главной — там прячется послание

---

## 📜 Лицензия

**CC BY-NC-ND 4.0** (Creative Commons Attribution-NonCommercial-NoDerivatives) — см. [LICENSE](./LICENSE).

Почему именно она:
- **BY (Attribution)** — авторство Shad11t сохраняется всегда: кто делится сайтом, обязан указать автора.
- **NC (NonCommercial)** — запрет коммерческого использования: никто не сделает бизнес на твоём дизайне.
- **ND (NoDerivatives)** — запрет публикации изменённых версий: код можно читать и изучать, но нельзя взять дизайн, чуть поменять и выдать за свой.

Почему не MIT/Apache: они разрешают вообще всё, включая копирование дизайна под своим именем — прямо против твоих требований. Почему не «All rights reserved»: ты хотел, чтобы люди могли учиться по коду — CC это разрешает. Лицензии твоих модов/приложений не конфликтуют: лицензия покрывает только этот сайт, а у каждого проекта своя.

---

## 👤 Автор

**Shad11t** — Minecraft-блогер и программист.

- YouTube: https://www.youtube.com/@shad11t_the_shadow
- Telegram: https://t.me/SHAD11T
- Boosty: https://boosty.to/shad11ttheshadow
- GitHub: https://github.com/GoShadowS

*Собрано в темноте. Тени одобряют. 🌑*
