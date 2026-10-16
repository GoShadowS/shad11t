/**
 * Shad11t — генератор хеша пароля администратора.
 *
 * Использование:
 *   npm run hash-password -- <новый-пароль>
 *
 * Скрипт печатает JSON { salt, iterations, hash } — его нужно вставить
 * в файл src/data/admin.json и запушить в main.
 *
 * ВАЖНО: используется та же реализация SHA-256, что и в браузере
 * (src/scripts/sha256.js) — единый источник истины, рассинхрон невозможен.
 */
import { randomBytes } from 'node:crypto';
import { sha256hex } from '../src/scripts/sha256.js';

export const ITERATIONS = 25000;

export function hashPassword(password, salt, iterations = ITERATIONS) {
  let h = String(password);
  for (let i = 0; i < iterations; i++) {
    h = sha256hex(`${salt}:${h}`);
  }
  return h;
}

const pass = process.argv[2];
if (!pass) {
  console.error('Использование: npm run hash-password -- <новый-пароль>');
  process.exit(1);
}
if (pass.length < 8) {
  console.error('Пароль должен быть не короче 8 символов.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = hashPassword(pass, salt, ITERATIONS);
console.log(JSON.stringify({ salt, iterations: ITERATIONS, hash }, null, 2));
