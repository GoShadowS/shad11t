/**
 * Shad11t — GET /projects.json: канонические данные витрины.
 * Генерируется при сборке из src/data/projects.json.
 * Клиент объединяет это с локальным оверлеем админки (см. src/scripts/store.js).
 */
import data from '../data/projects.json';

export function GET() {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
