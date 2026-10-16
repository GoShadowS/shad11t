/**
 * Shad11t — страница контактов: копирование, интерактивная книга отзывов и гостевая книга.
 */

import { $, $$, toast, copyText, esc } from './utils.js';
import { sfx } from './audio.js';

const STORAGE_KEY = 'shad11t_guestbook_v1';

const DEFAULT_REVIEWS = [
  {
    id: 'rev-1',
    name: 'CraftMaster_99',
    role: 'Геймер',
    rating: 5,
    message: 'AquaCraft — один из лучших модов на биомы и воду! Оптимизация на высоте, жду апдейт под новую версию.',
    date: 'Вчера, 18:42',
  },
  {
    id: 'rev-2',
    name: 'DevLotl',
    role: 'Разработчик',
    rating: 5,
    message: 'Лаунчер на Rust/Tauri летает просто мгновенно, по сравнению с обычными монстрами на электроне — небо и земля. Уважение за чистый код!',
    date: '3 дня назад',
  },
  {
    id: 'rev-3',
    name: 'ShadowFan',
    role: 'Зритель',
    rating: 5,
    message: 'Смотрю каждый ролик на YouTube! Подача топовая, аксолотль лучший :)',
    date: 'Неделю назад',
  },
];

function getStoredReviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_REVIEWS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_REVIEWS];
  } catch {
    return [...DEFAULT_REVIEWS];
  }
}

function saveReviews(reviews) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    /* ignore */
  }
}

export function initContact() {
  const cleanups = [];

  // 1. Копирование ссылок в соц-карточках
  $$('[data-copy]').forEach((btn) => {
    const onClick = async () => {
      const text = btn.dataset.copy || '';
      try {
        await copyText(text);
        toast('Скопировано в буфер обмена');
        try { sfx('success'); } catch { /* ignore */ }
        const original = btn.innerHTML;
        btn.innerHTML = '<span class="text-phos font-bold">✓</span>';
        setTimeout(() => {
          btn.innerHTML = original;
        }, 1600);
      } catch {
        toast('Не удалось скопировать', 'err');
      }
    };
    btn.addEventListener('click', onClick);
    cleanups.push(() => btn.removeEventListener('click', onClick));
  });

  // 2. Гостевая книга и отзывы
  const form = $('#review-form');
  const reviewsList = $('#reviews-list');
  const countBadge = $('#reviews-count');
  const msgInput = $('#rf-message');
  const counter = $('#rf-counter');
  const ratingGroup = $('#rf-rating-group');
  const ratingLabel = $('#rf-rating-label');
  const resetDemoBtn = $('#rf-reset-demo');

  let currentRating = 5;
  let reviews = getStoredReviews();

  const renderReviews = () => {
    if (!reviewsList) return;
    if (countBadge) countBadge.textContent = `${reviews.length} ${reviews.length === 1 ? 'запись' : reviews.length < 5 ? 'записи' : 'записей'}`;

    if (!reviews.length) {
      reviewsList.innerHTML = `
        <div class="border border-white/10 bg-void/60 p-6 text-center text-sage">
          <p class="font-display text-lg text-bone">Аквариум пока пуст</p>
          <p class="text-[13px] mt-1">Будь первым, кто оставит след в книге!</p>
        </div>
      `;
      return;
    }

    reviewsList.innerHTML = reviews
      .map(
        (r) => `
        <div class="border border-white/10 bg-void/70 p-4 transition-all duration-300 hover:border-phos/40">
          <div class="flex items-center justify-between gap-3 border-b border-white/5 pb-2.5">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-display font-bold text-bone text-[14px]">${esc(r.name)}</span>
              <span class="font-mono text-[10px] px-2 py-0.5 border border-phos/30 text-phos bg-phos/5 uppercase tracking-wider">${esc(r.role || 'Гость')}</span>
            </div>
            <span class="font-mono text-[11px] text-sage/60 whitespace-nowrap">${esc(r.date)}</span>
          </div>
          <div class="my-2 flex items-center gap-1 text-[13px]">
            ${'🫧'.repeat(Math.max(1, Math.min(5, Number(r.rating) || 5)))}
            <span class="font-mono text-[11px] text-phos font-bold ml-1">${r.rating}/5</span>
          </div>
          <p class="text-[13px] leading-relaxed text-bone/90">${esc(r.message)}</p>
        </div>
      `,
      )
      .join('');
  };

  renderReviews();

  // Живой счетчик символов
  if (msgInput && counter) {
    const onInput = () => {
      counter.textContent = `${msgInput.value.length} / ${msgInput.maxLength || 400}`;
    };
    msgInput.addEventListener('input', onInput);
    cleanups.push(() => msgInput.removeEventListener('input', onInput));
  }

  // Выбор рейтинга
  if (ratingGroup) {
    const starButtons = ratingGroup.querySelectorAll('.star-btn');
    const updateStars = (val) => {
      currentRating = val;
      starButtons.forEach((btn) => {
        const s = Number(btn.dataset.star || 0);
        if (s <= val) {
          btn.classList.add('border-phos/60', 'text-phos');
          btn.classList.remove('opacity-40');
        } else {
          btn.classList.remove('border-phos/60', 'text-phos');
          btn.classList.add('opacity-40');
        }
      });
      if (ratingLabel) {
        const desc = val === 5 ? 'максимум 🫧' : val === 4 ? 'отлично 👍' : val === 3 ? 'хорошо 👌' : val === 2 ? 'пойдёт 😐' : 'ну такое 👎';
        ratingLabel.textContent = `${val} / 5 (${desc})`;
      }
    };

    starButtons.forEach((btn) => {
      const onStarClick = () => {
        const val = Number(btn.dataset.star || 5);
        updateStars(val);
        try { sfx('click'); } catch { /* ignore */ }
      };
      btn.addEventListener('click', onStarClick);
      cleanups.push(() => btn.removeEventListener('click', onStarClick));
    });
  }

  // Отправка отзыва
  if (form) {
    const onSubmit = (e) => {
      e.preventDefault();
      const nameField = $('#rf-name');
      const roleField = $('#rf-role');
      const msgField = $('#rf-message');

      const name = nameField?.value.trim() || 'Анонимный аксолотль';
      const role = roleField?.value || 'Гость';
      const message = msgField?.value.trim() || '';

      if (!message) {
        toast('Пожалуйста, напиши текст отзыва', 'err');
        msgField?.focus();
        return;
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newReview = {
        id: `rev-${Date.now()}`,
        name,
        role,
        rating: currentRating,
        message,
        date: `Сегодня, ${timeStr}`,
      };

      reviews.unshift(newReview);
      saveReviews(reviews);
      renderReviews();

      // Очистка формы
      if (msgField) msgField.value = '';
      if (counter) counter.textContent = '0 / 400';

      toast('Отзыв успешно добавлен в гостевую книгу! 🫧');
      try { sfx('success'); } catch { /* ignore */ }
    };

    form.addEventListener('submit', onSubmit);
    cleanups.push(() => form.removeEventListener('submit', onSubmit));
  }

  // Сброс к исходным демо-отзывам
  if (resetDemoBtn) {
    const onReset = () => {
      reviews = [...DEFAULT_REVIEWS];
      saveReviews(reviews);
      renderReviews();
      toast('Гостевая книга сброшена к исходным записям');
      try { sfx('click'); } catch { /* ignore */ }
    };
    resetDemoBtn.addEventListener('click', onReset);
    cleanups.push(() => resetDemoBtn.removeEventListener('click', onReset));
  }

  return () => cleanups.forEach((fn) => fn());
}
