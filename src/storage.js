import { normalizeScene } from './scenes.js';
export const STORAGE_KEY = 'rain-room:v2';
export const DEFAULTS = { amount: 65, wind: 12, light: 85, volume: 40, texture: 75, scene: 'forest', quality: 'auto', motion: true, chime: true, focusMinutes: 25, breakMinutes: 5 };
export function sanitizePreferences(input = {}) {
  const result = { ...DEFAULTS };
  for (const [key, min, max] of [['amount', 5, 100], ['wind', -100, 100], ['light', 15, 100], ['volume', 0, 100], ['texture', 0, 100], ['focusMinutes', 1, 180], ['breakMinutes', 1, 180]]) {
    if (typeof input?.[key] === 'number' && Number.isInteger(input[key]) && input[key] >= min && input[key] <= max) result[key] = input[key];
  }
  for (const key of ['motion', 'chime']) if (typeof input?.[key] === 'boolean') result[key] = input[key];
  if (['auto', 'low', 'high'].includes(input?.quality)) result.quality = input.quality;
  result.scene = normalizeScene(input?.scene);
  return result;
}
export function loadData(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { data: {}, available: true };
    const parsed = JSON.parse(raw);
    return { data: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}, available: true };
  } catch { return { data: {}, available: false }; }
}
