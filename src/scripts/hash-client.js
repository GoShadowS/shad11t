/**
 * SHADVOID — хеширование пароля в браузере.
 * Тот же алгоритм, что в scripts/hash-password.mjs (единый sha256.js).
 */

import { sha256hex } from './sha256.js';

export const ITERATIONS = 25000;

export function hashPassword(password, salt, iterations = ITERATIONS) {
  let h = String(password);
  for (let i = 0; i < iterations; i++) {
    h = sha256hex(`${salt}:${h}`);
  }
  return h;
}

/** Сравнение без раннего выхода (чтобы не светить длину совпадений). */
export function safeEqual(a, b) {
  const x = String(a);
  const y = String(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export function randomSalt(bytes = 16) {
  const arr = new Uint8Array(bytes);
  if (crypto?.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < bytes; i++) arr[i] = (Math.random() * 256) | 0;
  return [...arr].map((v) => v.toString(16).padStart(2, '0')).join('');
}
