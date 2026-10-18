import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SCENE_ORDER, normalizeScene } from '../src/scenes.js';
import { rainMix } from '../src/audio.js';

test('scene menu follows spring, summer, autumn, winter, then day and night', async () => {
  const order = ['spring', 'pond', 'forest', 'lake', 'day', 'window'];
  assert.deepEqual(SCENE_ORDER, order);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const menu = html.match(/<select id="scene"[\s\S]*?<\/select>/)[0];
  assert.deepEqual([...menu.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]), order);
  for (const scene of order) assert.equal(normalizeScene(scene), scene);
});
test('frozen lake keeps wind without playing either rain recording', () => {
  for (const texture of [0, 100]) {
    const mix = rainMix({ scene: 'lake', texture });
    assert.equal(mix.levels.bed, 0); assert.equal(mix.levels.detail, 0);
    assert.ok(mix.levels.wind > 0);
  }
});
