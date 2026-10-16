/**
 * Shad11t — мультиязычность (RU / EN).
 * Хранит выбранный язык в localStorage ('shad11t_lang').
 * Мгновенно переводит все элементы с [data-i18n] без перезагрузки страницы.
 */

import { $, $$, toast } from './utils.js';
import { sfx } from './audio.js';

export const DICT = {
  ru: {
    // Nav
    'nav.home': 'Главная',
    'nav.projects': 'Проекты',
    'nav.about': 'Обо мне',
    'nav.content': 'Контент',
    'nav.contact': 'Контакты',
    'nav.status': 'аксолотль',
    'nav.youtube': 'YouTube',

    // Hero
    'hero.badge': 'shad11t.exe — запущен',
    'hero.title': 'SHAD11T',
    'hero.role': 'Программист и создатель контента.',
    'hero.desc': 'Разработка в самых разных сферах: веб-сервисы, приложения, боты, моды и видео на YouTube. Осмотрись — тут всё моё.',
    'hero.btnProjects': 'Смотреть проекты',
    'hero.statusLbl': 'статус //',
    'hero.statusVal': 'аксолотль',
    'hero.engineLbl': 'движок //',
    'hero.engineVal': 'shad11t_os v2.0',
    'hero.locLbl': 'локация //',
    'hero.locVal': 'под водой',
    'hero.scrollLbl': 'скролл //',
    'hero.scrollVal': 'вниз',

    // Marquee
    'mq.text': 'ПРОГРАММИРОВАНИЕ ◆ ВЕБ ◆ БОТЫ ◆ ПРИЛОЖЕНИЯ ◆ АКСОЛОТЛЬ ◆ YOUTUBE ◆ МОДЫ ◆ БУЛЬК',

    // Manifesto
    'manifesto.tag': '// манифест',
    'manifesto.text': 'Меня зовут Shad11t. Я программирую софт в самых разных направлениях, делаю приложения, моды и снимаю это на YouTube. Этот сайт — мой аквариум: заглядывай, вода тёплая.',
    'manifesto.link': '→ кто этот аксолотль',
    'manifesto.statProjects': 'проектов в витрине',
    'manifesto.statVideos': 'видео на канале',
    'manifesto.statLvl': 'уровень лотла',

    // Showcase
    'showcase.tag': '// избранное',
    'showcase.title': 'Собрано в одном аквариуме',
    'showcase.sub': 'Избранное с витрины. Листай вбок — там дальше ещё интереснее.',
    'showcase.allBtn': 'Вся витрина',
    'showcase.scrollHint': 'скролль → едет вбок ⟶',
    'showcase.moreTitle': 'и это не всё',
    'showcase.moreLink': 'открыть витрину',

    // Terminal
    'term.tag': '// прямой доступ',
    'term.title': 'Живой терминал',
    'term.sub': 'Настоящий, кликабельный, с характером. Спроси его о проектах, навыках и секретах. Только не пиши sudo. Хотя… попробуй.',

    // Content Teaser
    'content.tag': '// с канала',
    'content.title': 'Свежее с канала',
    'content.allLink': '→ весь контент',
    'content.subBtn': 'Подписаться на канал',
    'content.subHint': 'аксолотли тоже жмут колокольчик',

    // Connect
    'connect.tag': '// связь',
    'connect.title': 'ЗАЛЕТАЙ В АКВАРИУМ',
    'connect.sub': 'Видео — на YouTube. Код — на GitHub. Всё остальное — тоже где-то рядом. Выбирай портал.',

    // Footer
    'footer.tagline': 'аксолотль, который пишет код',
    'footer.desc': 'Shad11t — программист в разных сферах: приложения, веб-сервисы, боты, моды и видео на YouTube. Портфолио, блог и проекты в одном аквариуме.',
    'footer.nav': 'Навигация',
    'footer.sys': 'Система',
    'footer.status': 'Статус',
    'footer.copy': '© 2026 Shad11t · все бульки защищены',

    // About Page
    'about.dossierTag': '// досье // уровень доступа: все',
    'about.docTag': '// досье // уровень доступа: все',
    'about.title': 'Привет. Я — аксолотль, который пишет код.',
    'about.heroTitle': 'Привет. Я — аксолотль, который пишет код.',
    'about.bio': 'Меня зовут Shad11t. Разрабатываю софт в самых разных направлениях — от приложений, ботов и веб-сервисов до модов и инструментов, и снимаю процесс на YouTube. Этот сайт — мой аквариум: проекты, стек, видео и контакты.',
    'about.story': 'Меня зовут Shad11t. По паспорту — человек, по состоянию души — аксолотль: спокойный, розовый и беспощадный к багам. Разрабатываю софт в самых разных направлениях — от приложений, ботов и веб-сервисов до модов и инструментов, и снимаю процесс на YouTube. Этот сайт — мой аквариум: проекты, интересы, видосы и контакты.',
    'about.facts.species': 'Вид',
    'about.facts.speciesVal': 'аксолотль',
    'about.facts.class': 'Класс',
    'about.facts.classVal': 'fullstack lotl',
    'about.facts.stack': 'Стек',
    'about.facts.stackVal': 'Java · Web · Python · Apps',
    'about.facts.channel': 'Канал',
    'about.facts.channelVal': 'видео на YouTube',
    'about.orbitTag': '// карта интересов',
    'about.orbitTitle': 'Орбита интересов',
    'about.orbitSub': 'Интерактивная карта направлений и навыков. Нажмите на любой узел для подробной информации.',
    'about.legend': 'Легенда орбит',
    'about.legLang': 'языки программирования',
    'about.legMc': 'моддинг и плагины',
    'about.legApp': 'приложения и веб',
    'about.legTools': 'инструменты',
    'about.legMedia': 'медиа и контент',
    'about.stackTag': '// стек',
    'about.stackTitle': 'Чем я занимаюсь',
    'about.ctaTitle': 'Хочешь так же? Смотри, как я это делаю.',
    'about.ctaSub': 'Разбираю софт, код и проекты на канале — с реальными фичами и фиксами, как есть.',
    'about.ctaChannel': 'На канал',
    'about.ctaProjects': 'К проектам',

    // Projects Page
    'projects.tag': '// витрина // проекты',
    'projects.title': 'Витрина проектов',
    'projects.sub': 'Моды, десктопные и мобильные приложения, боты, плагины и скрипты. Выбирай фильтр или ищи по стеку.',
    'projects.searchPh': 'Поиск по названию или тегу…',
    'projects.all': 'Всё',
    'projects.mods': 'Моды и плагины',
    'projects.apps': 'Десктопное приложение',
    'projects.mobile': 'Мобильное приложение',
    'projects.other': 'Скрипты и боты',
    'projects.count': 'экспонатов',

    // Content Page
    'contentPage.tag': '// эфир // видео',
    'contentPage.title': 'Эфир из аквариума.',
    'contentPage.sub': 'Канал — это закулисье всех проектов с витрины: летсплеи, девлоги и туториалы без воды и занудства.',
    'contentPage.watchBtn': 'Смотреть на канале ↗',
    'contentPage.featuredTag': 'Главный релиз',
    'contentPage.allVideosTag': '// все видео',

    // Contact Page
    'contact.tag': '// порталы связи',
    'contact.title': 'Выходи на связь',
    'contact.sub': 'Четыре официальных портала, гостевая книга с отзывами и форма обратной связи. Выбирай удобный канал.',
    'contact.guestbookTag': '// сообщество // аквариум',
    'contact.guestbookTitle': 'Книга отзывов и приветствий',
    'contact.guestbookSub': 'Оставь отзыв о проектах, пожелание или идею. Запись мгновенно сохранится в локальной книге аквариума!',
    'contact.yandexForm': 'Яндекс Форма ↗',
    'contact.form.name': 'Твой позывной / Имя',
    'contact.form.role': 'Кто ты?',
    'contact.form.rating': 'Оценка / Настроение',
    'contact.form.message': 'Твой отзыв или сообщение',
    'contact.form.submit': 'Оставить отзыв в аквариуме',
    'contact.feed': 'Лента гостевой книги',
    'contact.faqTag': '// частые вопросы',
    'contact.faqTitle': 'Отвечаю',
    'contactPage.tag': '// порталы связи',
    'contactPage.title': 'Выходи на связь',
    'contactPage.sub': 'Четыре официальных портала, гостевая книга с отзывами и форма обратной связи. Выбирай удобный канал.',
    'contactPage.openBtn': 'Открыть ↗',
    'contactPage.bookTag': '// сообщество // аквариум',
    'contactPage.bookTitle': 'Книга отзывов и приветствий',
    'contactPage.bookSub': 'Оставь отзыв о проектах, пожелание или идею. Запись мгновенно сохранится в локальной книге аквариума!',
    'contactPage.yandexForm': 'Яндекс Форма ↗',
    'contactPage.formName': 'Твой позывной / Имя',
    'contactPage.formRole': 'Кто ты?',
    'contactPage.formRating': 'Оценка / Настроение',
    'contactPage.formMsg': 'Твой отзыв или сообщение',
    'contactPage.formSubmit': 'Оставить отзыв в аквариуме',
    'contactPage.faqTag': '// частые вопросы',
    'contactPage.faqTitle': 'Отвечаю',

    // 404 Page
    'p404.tag': '// 404 // ошибка адреса',
    'p404.title': 'СТРАНИЦА НЕ НАЙДЕНА',
    'p404.desc': 'Такой страницы не существует или она была перемещена по новому адресу.',
    'p404.homeBtn': 'На главную',
  },
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.projects': 'Projects',
    'nav.about': 'About',
    'nav.content': 'Content',
    'nav.contact': 'Contact',
    'nav.status': 'axolotl',
    'nav.youtube': 'YouTube',

    // Hero
    'hero.badge': 'shad11t.exe — running',
    'hero.title': 'SHAD11T',
    'hero.role': 'Software Engineer & Content Creator.',
    'hero.desc': 'Development across diverse domains: web services, desktop and mobile apps, bots, tools, and YouTube devlogs. Welcome to my digital aquarium.',
    'hero.btnProjects': 'Explore Projects',
    'hero.statusLbl': 'status //',
    'hero.statusVal': 'axolotl',
    'hero.engineLbl': 'engine //',
    'hero.engineVal': 'shad11t_os v2.0',
    'hero.locLbl': 'location //',
    'hero.locVal': 'underwater',
    'hero.scrollLbl': 'scroll //',
    'hero.scrollVal': 'down',

    // Marquee
    'mq.text': 'PROGRAMMING ◆ WEB ◆ BOTS ◆ APPS ◆ AXOLOTL ◆ YOUTUBE ◆ MODS ◆ BLOOP',

    // Manifesto
    'manifesto.tag': '// manifesto',
    'manifesto.text': "I'm Shad11t. I craft software across multiple domains, build apps, mods, tools, and document the process on YouTube. This website is my aquarium: dive in, the water is warm.",
    'manifesto.link': '→ who is this axolotl',
    'manifesto.statProjects': 'showcase projects',
    'manifesto.statVideos': 'channel videos',
    'manifesto.statLvl': 'lotl level',

    // Showcase
    'showcase.tag': '// featured',
    'showcase.title': 'Crafted in one aquarium',
    'showcase.sub': 'Selected showcase highlights. Scroll sideways to discover more.',
    'showcase.allBtn': 'Full Showcase',
    'showcase.scrollHint': 'scroll → slides sideways ⟶',
    'showcase.moreTitle': 'and much more',
    'showcase.moreLink': 'open showcase',

    // Terminal
    'term.tag': '// direct access',
    'term.title': 'Live Terminal',
    'term.sub': 'Interactive CLI shell with personality. Ask about projects, skills, and secrets. Just avoid sudo... or try it if you dare.',

    // Content Teaser
    'content.tag': '// from channel',
    'content.title': 'Fresh from Channel',
    'content.allLink': '→ all content',
    'content.subBtn': 'Subscribe on YouTube',
    'content.subHint': 'axolotls ring the bell too',

    // Connect
    'connect.tag': '// portals',
    'connect.title': 'DIVE INTO THE AQUARIUM',
    'connect.sub': 'Videos on YouTube. Code on GitHub. Everything else is nearby. Choose your portal.',

    // Footer
    'footer.tagline': 'an axolotl who writes code',
    'footer.desc': 'Shad11t — multi-disciplinary software developer: apps, web services, bots, mods, and YouTube tech content.',
    'footer.nav': 'Navigation',
    'footer.sys': 'System',
    'footer.status': 'Status',
    'footer.copy': '© 2026 Shad11t · all bloops reserved',

    // About Page
    'about.dossierTag': '// dossier // access level: public',
    'about.docTag': '// dossier // access level: public',
    'about.title': 'Hi. I am an axolotl who writes code.',
    'about.heroTitle': 'Hi. I am an axolotl who writes code.',
    'about.bio': "My name is Shad11t. I develop software across multiple domains — from apps, bots, and web services to mods and tools, and document it on YouTube. This site is my aquarium: projects, stack, videos, and contacts.",
    'about.story': "I'm Shad11t. Human on passport, axolotl at heart: calm, pink, and merciless to bugs. I engineer software across different stacks — from apps and bots to mods and tools, and share devlogs on YouTube. This site is my aquarium: projects, interests, and contacts.",
    'about.facts.species': 'Species',
    'about.facts.speciesVal': 'axolotl',
    'about.facts.class': 'Class',
    'about.facts.classVal': 'fullstack lotl',
    'about.facts.stack': 'Stack',
    'about.facts.stackVal': 'Java · Web · Python · Apps',
    'about.facts.channel': 'Channel',
    'about.facts.channelVal': 'videos on YouTube',
    'about.orbitTag': '// orbit map',
    'about.orbitTitle': 'Orbit of Interests',
    'about.orbitSub': 'Interactive map of technologies and skills. Click any node to explore details.',
    'about.legend': 'Orbit Legend',
    'about.legLang': 'programming languages',
    'about.legMc': 'modding & plugins',
    'about.legApp': 'apps & web services',
    'about.legTools': 'dev tools & linux',
    'about.legMedia': 'media & video editing',
    'about.stackTag': '// tech stack',
    'about.stackTitle': 'What I Work With',
    'about.ctaTitle': 'Want to build cool things? Watch how I do it.',
    'about.ctaSub': 'I break down real code, architecture, and features on my channel with real workflows.',
    'about.ctaChannel': 'Visit Channel',
    'about.ctaProjects': 'View Projects',

    // Projects Page
    'projects.tag': '// showcase // projects',
    'projects.title': 'Project Showcase',
    'projects.sub': 'Mods, desktop and mobile applications, bots, Spigot plugins, and scripts. Filter by category or search by tech stack.',
    'projects.searchPh': 'Search by title or tag…',
    'projects.all': 'All',
    'projects.mods': 'Mods & Plugins',
    'projects.apps': 'Desktop Apps',
    'projects.mobile': 'Mobile Apps',
    'projects.other': 'Bots & Scripts',
    'projects.count': 'items',

    // Content Page
    'contentPage.tag': '// stream // videos',
    'contentPage.title': 'Aquarium Broadcast.',
    'contentPage.sub': 'The channel is behind-the-scenes for all showcase projects: devlogs, tutorials, and experiments.',
    'contentPage.watchBtn': 'Watch on YouTube ↗',
    'contentPage.featuredTag': 'Featured Release',
    'contentPage.allVideosTag': '// all videos',

    // Contact Page
    'contact.tag': '// communication portals',
    'contact.title': 'Get in Touch',
    'contact.sub': 'Four official channels, interactive community guestbook, and direct feedback form.',
    'contact.guestbookTag': '// community // aquarium',
    'contact.guestbookTitle': 'Guestbook & Reviews',
    'contact.guestbookSub': 'Leave a review about projects, feedback or an idea. Entries appear immediately in the local guestbook!',
    'contact.yandexForm': 'Feedback Form ↗',
    'contact.form.name': 'Your Name / Handle',
    'contact.form.role': 'Who are you?',
    'contact.form.rating': 'Rating / Vibe',
    'contact.form.message': 'Your review or message',
    'contact.form.submit': 'Post to Aquarium Guestbook',
    'contact.feed': 'Guestbook Stream',
    'contact.faqTag': '// FAQ',
    'contact.faqTitle': 'Frequently Asked Questions',
    'contactPage.tag': '// communication portals',
    'contactPage.title': 'Get in Touch',
    'contactPage.sub': 'Four official channels, interactive community guestbook, and direct feedback form.',
    'contactPage.openBtn': 'Open ↗',
    'contactPage.bookTag': '// community // aquarium',
    'contactPage.bookTitle': 'Guestbook & Reviews',
    'contactPage.bookSub': 'Leave a review about projects, feedback or an idea. Entries appear immediately in the local guestbook!',
    'contactPage.yandexForm': 'Feedback Form ↗',
    'contactPage.formName': 'Your Name / Handle',
    'contactPage.formRole': 'Who are you?',
    'contactPage.formRating': 'Rating / Vibe',
    'contactPage.formMsg': 'Your review or message',
    'contactPage.formSubmit': 'Post to Aquarium Guestbook',
    'contactPage.faqTag': '// FAQ',
    'contactPage.faqTitle': 'Frequently Asked Questions',

    // 404 Page
    'p404.tag': '// 404 // address error',
    'p404.title': 'PAGE NOT FOUND',
    'p404.desc': 'This page does not exist or has been relocated to another address.',
    'p404.homeBtn': 'Back to Home',
  },
};

const LANG_KEY = 'shad11t_lang';

export function getLanguage() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'ru') return saved;
  } catch {
    /* ignore */
  }
  return 'ru';
}

export function setLanguage(lang) {
  const target = lang === 'en' ? 'en' : 'ru';
  try {
    localStorage.setItem(LANG_KEY, target);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = target;
  applyTranslations(target);
  updateLangToggleButtons(target);
  window.dispatchEvent(new CustomEvent('shad11t:langchange', { detail: { lang: target } }));
}

export function applyTranslations(lang = getLanguage()) {
  const dict = DICT[lang] || DICT.ru;

  // Текстовые узлы
  $$('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key && dict[key] !== undefined) {
      el.textContent = dict[key];
    }
  });

  // Placeholder'ы
  $$('[data-i18n-ph]').forEach((el) => {
    const key = el.dataset.i18nPh;
    if (key && dict[key] !== undefined) {
      el.placeholder = dict[key];
    }
  });

  // Titles
  $$('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (key && dict[key] !== undefined) {
      el.title = dict[key];
    }
  });
}

function updateLangToggleButtons(lang = getLanguage()) {
  $$('#lang-toggle, #lang-toggle-m').forEach((btn) => {
    const ruSpan = btn.querySelector('[data-lang-ind="ru"]');
    const enSpan = btn.querySelector('[data-lang-ind="en"]');
    if (ruSpan && enSpan) {
      if (lang === 'en') {
        ruSpan.className = 'text-sage/60 font-normal';
        enSpan.className = 'text-phos font-bold';
      } else {
        ruSpan.className = 'text-phos font-bold';
        enSpan.className = 'text-sage/60 font-normal';
      }
    }
  });
}

export function initI18n() {
  const initialLang = getLanguage();
  document.documentElement.lang = initialLang;
  applyTranslations(initialLang);
  updateLangToggleButtons(initialLang);

  const cleanups = [];

  const handleToggle = (e) => {
    e.preventDefault();
    const current = getLanguage();
    const next = current === 'ru' ? 'en' : 'ru';
    setLanguage(next);
    toast(next === 'en' ? 'Language switched to English' : 'Язык переключён на Русский');
    try { sfx('click'); } catch { /* ignore */ }
  };

  $$('#lang-toggle, #lang-toggle-m').forEach((btn) => {
    btn.addEventListener('click', handleToggle);
    cleanups.push(() => btn.removeEventListener('click', handleToggle));
  });

  return () => cleanups.forEach((fn) => fn());
}
