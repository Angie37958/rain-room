import test from 'node:test';
import assert from 'node:assert/strict';
import { loadData, sanitizePreferences, DEFAULTS } from '../src/storage.js';
test('missing, corrupt and restricted storage remain usable', () => {
  assert.deepEqual(loadData({ getItem: () => null }), { data: {}, available: true });
  assert.deepEqual(loadData({ getItem: () => '{broken' }), { data: {}, available: false });
  assert.deepEqual(loadData({ getItem() { throw new Error('denied'); } }), { data: {}, available: false });
  assert.deepEqual(loadData({ getItem: () => 'null' }).data, {});
});
test('preferences accept only bounded known values', () => {
  assert.deepEqual(sanitizePreferences(null), DEFAULTS);
  assert.deepEqual(sanitizePreferences({ amount: 101, volume: -1, motion: 'yes', quality: 'ultra', focusMinutes: 2.5 }), DEFAULTS);
  const prefs = sanitizePreferences({ amount: 20, volume: 0, motion: false, quality: 'low', extra: 'ignore' });
  assert.equal(prefs.amount, 20); assert.equal(prefs.volume, 0); assert.equal(prefs.motion, false); assert.equal(prefs.quality, 'low'); assert.equal(prefs.extra, undefined);
});
test('old preferences gain a green scene and grain control without losing prior settings', () => {
  const prefs = sanitizePreferences({ volume: 28, light: 75 });
  assert.equal(prefs.scene, 'forest'); assert.equal(prefs.texture, 75); assert.equal(prefs.volume, 28);
  assert.equal(sanitizePreferences({ scene: 'pond', texture: 100 }).scene, 'pond');
  assert.equal(sanitizePreferences({ scene: 'unknown', texture: -1 }).texture, 75);
});
test('retired garden migrates safely and blue/grey scenes preserve user settings', () => {
  const old = sanitizePreferences({ scene: 'garden', focusMinutes: 50, volume: 32 });
  assert.equal(old.scene, 'forest'); assert.equal(old.focusMinutes, 50); assert.equal(old.volume, 32);
  for (const scene of ['forest', 'pond', 'lake', 'window']) assert.equal(sanitizePreferences({ scene }).scene, scene);
});
