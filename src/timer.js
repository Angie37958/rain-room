/** Timer calculations are independent of rendering and browser interval frequency. */
export const MINUTE = 60_000;
export const DEFAULT_MINUTES = { focus: 25, break: 5 };
export function validMinutes(value, fallback = 25) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 180 ? number : fallback;
}
export function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function localDate(now = Date.now()) {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class FocusTimer {
  constructor(mode = 'focus', minutes = DEFAULT_MINUTES[mode]) { this.reset(mode, minutes); }
  reset(mode = this.mode, minutes = this.minutes) {
    this.mode = mode === 'break' ? 'break' : 'focus';
    this.minutes = validMinutes(minutes, DEFAULT_MINUTES[this.mode]);
    this.remaining = this.minutes * MINUTE;
    this.status = 'idle';
    this.deadline = null;
    this.id = newId();
  }
  start(now = Date.now()) {
    if (!['idle', 'paused'].includes(this.status)) return;
    this.deadline = now + this.remaining;
    this.status = 'running';
  }
  tick(now = Date.now()) {
    if (this.status !== 'running') return null;
    // Clamp a system-clock adjustment backwards to the original duration.
    this.remaining = Math.min(this.minutes * MINUTE, Math.max(0, this.deadline - now));
    if (this.remaining > 0) return null;
    this.status = 'complete';
    const completion = { id: this.id, mode: this.mode, minutes: this.minutes, completedAt: this.deadline, date: localDate(this.deadline) };
    this.deadline = null;
    return completion;
  }
  pause(now = Date.now()) {
    const completion = this.tick(now);
    if (this.status === 'running') { this.status = 'paused'; this.deadline = null; }
    return completion;
  }
  snapshot() {
    return { mode: this.mode, minutes: this.minutes, remaining: this.remaining, status: this.status, deadline: this.deadline, id: this.id };
  }
  static restore(saved, now = Date.now()) {
    const timer = new FocusTimer(saved?.mode, saved?.minutes);
    if (!saved || !['paused', 'running', 'complete'].includes(saved.status)) return timer;
    const duration = timer.minutes * MINUTE;
    if (typeof saved.id !== 'string' || saved.id.length > 100 || !Number.isFinite(saved.remaining) || saved.remaining < 0 || saved.remaining > duration) return timer;
    if (saved.status === 'running') {
      // An already expired session from a closed page is not awarded as focus time.
      if (!Number.isFinite(saved.deadline) || saved.deadline <= now || saved.deadline > now + duration) return timer;
      timer.deadline = saved.deadline;
      timer.remaining = saved.deadline - now;
    } else { timer.remaining = saved.remaining; }
    timer.status = saved.status;
    timer.id = saved.id;
    return timer;
  }
}

export function sanitizeRecords(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(record => {
    if (!record || typeof record.id !== 'string' || !record.id || record.id.length > 100 || seen.has(record.id) || record.mode !== 'focus' || typeof record.minutes !== 'number' || validMinutes(record.minutes, 0) === 0 || !Number.isFinite(record.completedAt) || record.completedAt < 0 || record.completedAt > 8.64e15 || !validDateKey(record.date)) return false;
    seen.add(record.id);
    return true;
  }).map(({ id, minutes, mode, date, completedAt }) => ({ id, minutes, mode, date, completedAt }));
}
function validDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number), date = new Date(Date.UTC(year, month - 1, day));
  return year >= 1970 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
export function addCompletion(records, completion) {
  if (!completion || completion.mode !== 'focus' || records.some(record => record.id === completion.id)) return records;
  return sanitizeRecords([...records, completion]);
}
export function todaySummary(records, now = Date.now()) {
  const today = records.filter(record => record.date === localDate(now));
  return { minutes: today.reduce((sum, record) => sum + record.minutes, 0), sessions: today.length };
}
