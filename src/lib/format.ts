/** Форматирование дат и подписей категорий (едино для сервера и сборки). */

const MONTHS = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

export function formatDateRu(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export type Category = 'mod' | 'app' | 'mobile-app' | 'other';

export const CATEGORIES: Record<Category, { label: string; short: string; icon: string }> = {
  mod: { label: 'Моды и плагины', short: 'Мод', icon: 'Boxes' },
  app: { label: 'Десктопные приложения', short: 'App', icon: 'Monitor' },
  'mobile-app': { label: 'Мобильные приложения', short: 'Mobile', icon: 'Smartphone' },
  other: { label: 'Скрипты и прочее', short: 'Other', icon: 'Terminal' },
};

export function categoryLabel(cat: string): string {
  return (CATEGORIES as Record<string, { label: string }>)[cat]?.label ?? cat;
}

export function categoryShort(cat: string): string {
  return (CATEGORIES as Record<string, { short: string }>)[cat]?.short ?? cat;
}
