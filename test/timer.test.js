import test from 'node:test';
import assert from 'node:assert/strict';
import { FocusTimer, MINUTE, formatTime, validMinutes, localDate, addCompletion, sanitizeRecords, todaySummary } from '../src/timer.js';

test('delayed background tick uses the deadline, completes once, and records original end date', () => {
  const now = new Date(2026, 9, 18, 23, 58).getTime();
  const timer = new FocusTimer('focus', 1); timer.start(now);
  const completion = timer.tick(now + 5 * MINUTE);
  assert.equal(timer.status, 'complete'); assert.equal(timer.remaining, 0);
  assert.equal(completion.completedAt, now + MINUTE);
  assert.equal(completion.date, localDate(now + MINUTE));
  assert.equal(timer.tick(now + 6 * MINUTE), null);
});
test('pause excludes time spent paused and resume keeps the remaining duration', () => {
  const timer = new FocusTimer('focus', 25); timer.start(1000); timer.pause(61_000);
  assert.equal(timer.remaining, 24 * MINUTE); assert.equal(timer.status, 'paused');
  timer.tick(200_000); assert.equal(timer.remaining, 24 * MINUTE);
  timer.start(300_000); timer.tick(360_000); assert.equal(timer.remaining, 23 * MINUTE);
});
test('pause after expiry returns the completion rather than losing it', () => {
  const timer = new FocusTimer('focus', 1); timer.start(0);
  assert.equal(timer.pause(MINUTE).mode, 'focus'); assert.equal(timer.status, 'complete');
});
test('reset discards incomplete time and changes session identity', () => {
  const timer = new FocusTimer('focus', 1), id = timer.id;
  timer.start(0); timer.tick(20_000); timer.reset();
  assert.equal(timer.remaining, MINUTE); assert.equal(timer.status, 'idle'); assert.notEqual(timer.id, id);
});
test('active and paused timers restore; an expired closed-page session is not awarded', () => {
  const timer = new FocusTimer('focus', 25); timer.start(1000);
  const resumed = FocusTimer.restore(timer.snapshot(), 61_000);
  assert.equal(resumed.status, 'running'); assert.equal(resumed.remaining, 24 * MINUTE);
  timer.pause(61_000);
  assert.equal(FocusTimer.restore(timer.snapshot(), 900_000).remaining, 24 * MINUTE);
  timer.start(1_000_000);
  assert.equal(FocusTimer.restore(timer.snapshot(), 3_000_000).status, 'idle');
});
test('damaged stored state cannot produce NaN or a timer beyond 180 minutes', () => {
  for (const saved of [null, {}, { minutes: -5 }, { mode: 'x', minutes: Infinity }, { minutes: 'hello', status: 'running', deadline: NaN }, { minutes: 1, id: 'x', status: 'running', remaining: MINUTE, deadline: 10 * MINUTE }]) {
    const timer = FocusTimer.restore(saved, 0);
    assert.ok(Number.isFinite(timer.remaining)); assert.ok(timer.minutes >= 1 && timer.minutes <= 180); assert.equal(timer.status, 'idle');
  }
});
test('rest, duplicates and resets cannot inflate completed focus totals', () => {
  const now = new Date(2026, 9, 18, 12).getTime();
  const record = { id: 'one', mode: 'focus', minutes: 25, completedAt: now, date: localDate(now) };
  let records = addCompletion([], record); records = addCompletion(records, record);
  records = addCompletion(records, { ...record, id: 'rest', mode: 'break' });
  assert.deepEqual(todaySummary(records, now), { minutes: 25, sessions: 1 });
  assert.deepEqual(todaySummary(records, now + 24 * 60 * MINUTE), { minutes: 0, sessions: 0 });
});
test('stored records are sanitized and only known fields survive', () => {
  const record = { id: 'one', mode: 'focus', minutes: 25, completedAt: 1000, date: '2026-10-18', task: 'private' };
  const records = sanitizeRecords([record, record, null, {}, { ...record, id: 'two', minutes: -1 }, { ...record, id: 'three', date: '=formula' }]);
  assert.equal(records.length, 1); assert.equal(records[0].task, undefined);
});
test('duration boundaries and display rounding', () => {
  assert.equal(validMinutes('50'), 50); assert.equal(validMinutes(180), 180);
  for (const value of [0, 181, 2.5, NaN, '', 'abc']) assert.equal(validMinutes(value, 25), 25);
  assert.equal(formatTime(59_001), '01:00'); assert.equal(formatTime(0), '00:00'); assert.equal(formatTime(-1), '00:00');
});
test('numeric strings and impossible dates cannot corrupt daily totals', () => {
  const record = { id: 'one', mode: 'focus', minutes: 25, completedAt: 1000, date: '2026-10-18' };
  const records = sanitizeRecords([{ ...record, minutes: '25' }, { ...record, date: '2026-02-30' }, { ...record, date: '2026-13-01' }, { ...record, id: '' }]);
  assert.equal(records.length, 0);
});
test('clock moving backwards is bounded by the configured duration', () => {
  const timer = new FocusTimer('focus', 1); timer.start(1000); timer.tick(-100_000); assert.equal(timer.remaining, MINUTE);
});
