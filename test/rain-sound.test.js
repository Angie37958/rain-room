import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesizeRain } from '../src/rain-sound.js';
import { rainMix } from '../src/audio.js';

function seeded(seed = 72) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function stats(samples) {
  let peak = 0, square = 0;
  for (const sample of samples) { assert.ok(Number.isFinite(sample)); peak = Math.max(peak, Math.abs(sample)); square += sample * sample; }
  return { peak, rms: Math.sqrt(square / samples.length) };
}
test('all rain layers produce bounded, non-silent stereo at common audio rates', () => {
  for (const rate of [44100, 48000]) for (const kind of ['bed', 'leaves', 'drops', 'glass']) {
    const channels = synthesizeRain(kind, rate, 2, seeded());
    assert.equal(channels.length, 2); assert.equal(channels[0].length, rate * 2);
    for (const channel of channels) { const signal = stats(channel); assert.ok(signal.peak <= .851); assert.ok(signal.rms > .001); }
    assert.notDeepEqual(channels[0], channels[1]);
  }
});
test('recorded rain preserves detail outdoors and is softened through the window', () => {
  const forest = rainMix({ scene: 'forest' }), window = rainMix({ scene: 'window' });
  assert.ok(window.cutoff < forest.cutoff);
  assert.ok(window.levels.detail < forest.levels.detail);
  for (const scene of ['spring', 'pond', 'forest', 'window']) {
    const mix = rainMix({ scene, texture: 100 });
    assert.ok(mix.levels.bed > 0); assert.ok(mix.levels.detail > 0);
    assert.equal(mix.levels.wind, 0);
  }
});

test('soft drop samples have a rounded onset rather than sharp single-sample clicks', () => {
  const samples = synthesizeRain('glass', 44100, 3, seeded())[0];
  let difference = 0, energy = 0;
  for (let i = 1; i < samples.length; i++) { difference += (samples[i] - samples[i - 1]) ** 2; energy += samples[i] ** 2; }
  assert.ok(difference / energy < .4);
});
test('near water drops retain distinct transients rather than becoming a continuous hiss', () => {
  const bed = stats(synthesizeRain('bed', 44100, 3, seeded())[0]);
  const drops = stats(synthesizeRain('drops', 44100, 3, seeded())[0]);
  assert.ok(drops.peak / drops.rms > bed.peak / bed.rms * 1.2);
});
