/**
 * Shad11t — страница контактов: копирование, «передача» сообщения в Telegram.
 */

import { $, $$, toast, copyText, isReducedMotion } from './utils.js';
import { sfx } from './audio.js';
import site from '../data/site.json';

export function initContact() {
  const cleanups = [];

  // копирование
  $$('[data-copy]').forEach((btn) => {
    const onClick = async () => {
      const text = btn.dataset.copy || '';
      try {
        await copyText(text);
        toast('Скопировано в буфер обмена');
        try { sfx('success'); } catch { /* ignore */ }
        const original = btn.innerHTML;
        btn.innerHTML = '<span class="text-phos font-bold">✓ скопировано</span>';
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

  // форма «передачи»
  const form = $('#contact-form');
  if (form) {
    const msg = $('#cf-message');
    const counter = $('#cf-counter');
    const btn = $('#cf-send');
    const btnLabel = btn?.querySelector('[data-label]');

    const onInput = () => {
      if (counter && msg) counter.textContent = `${msg.value.length} / ${msg.maxLength || 500}`;
    };
    msg?.addEventListener('input', onInput);
    onInput();

    const onSubmit = async (e) => {
      e.preventDefault();
      const name = $('#cf-name')?.value.trim() || 'Анонимный лотл';
      const topic = $('#cf-topic')?.value || 'Просто привет';
      const text = msg?.value.trim() || '';
      if (!text) {
        toast('Напиши хоть пару слов :)', 'err');
        msg?.focus();
        return;
      }
      const payload = `Привет, Shad11t! [${topic}] от ${name}:\n${text}`;
      try {
        await copyText(payload);
      } catch { /* всё равно открываем TG */ }

      const openTG = () => {
        window.open(site.socials.telegram, '_blank', 'noopener');
        toast('Сообщение скопировано — вставь его в Telegram');
        try { sfx('success'); } catch { /* ignore */ }
        if (btn) btn.disabled = false;
        if (btnLabel) btnLabel.textContent = 'Передать в Telegram ↗';
      };

      if (btn) btn.disabled = true;
      if (isReducedMotion() || !btnLabel) {
        openTG();
      } else {
        // «шифрование» 0.9с
        let p = 0;
        const t = setInterval(() => {
          p += 12;
          btnLabel.textContent = `шифрую… ${Math.min(p, 100)}%`;
          if (p >= 100) {
            clearInterval(t);
            openTG();
          }
        }, 90);
        cleanups.push(() => clearInterval(t));
      }
    };
    form.addEventListener('submit', onSubmit);
    cleanups.push(() => {
      form.removeEventListener('submit', onSubmit);
      msg?.removeEventListener('input', onInput);
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
