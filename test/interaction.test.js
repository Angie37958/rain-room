import test from 'node:test';
import assert from 'node:assert/strict';
import { RainInteraction, containsWater, WaterSurface } from '../src/interaction.js';

test('water taps stay at their screen-space origin, including near and distant water', () => {
  const interaction = new RainInteraction();
  for (const [x, y] of [[700, 650], [200, 880]]) {
    interaction.tap(x, y, 1200, 900, 'pond');
    const pulse = interaction.pulses.at(-1);
    assert.equal(pulse.x, x); assert.equal(pulse.y, y); assert.equal(pulse.water, true);
  }
  assert.equal(containsWater('forest', 600, 200, 1200, 900), false);
  assert.equal(containsWater('day', 600, 800, 1200, 900), false);
  assert.equal(containsWater('lake', 600, 800, 1200, 900), false);
  assert.equal(containsWater('spring', 620, 900, 1000, 1000), true);
  assert.equal(containsWater('spring', 40, 900, 1000, 1000), false);
});

test('rain opens a visible gap on both sides, then recovers gradually after the pointer leaves', () => {
  const interaction = new RainInteraction(); interaction.move(600, 400);
  const left = { x: -1 }, right = { x: 1 };
  for (let frame = 0; frame < 60; frame++) {
    interaction.step(1 / 60);
    interaction.bend(left, 570, 400, 1200, 900, 1 / 60);
    interaction.bend(right, 630, 400, 1200, 900, 1 / 60);
  }
  assert.ok(left.ox < -45); assert.ok(right.ox > 45);
  const displaced = right.ox;
  interaction.release();
  interaction.step(1 / 60); interaction.bend(right, 630, 400, 1200, 900, 1 / 60);
  assert.ok(right.ox > displaced * .8, 'recovery must not snap back');
  for (let frame = 0; frame < 240; frame++) {
    interaction.step(1 / 60); interaction.bend(right, 630, 400, 1200, 900, 1 / 60);
  }
  assert.ok(Math.abs(right.ox) < .1);
});

test('rapid gestures stay bounded, finite, expire, and do not age during a static frame', () => {
  const interaction = new RainInteraction();
  for (let i = 0; i < 500; i++) { interaction.move(i * 20, 700); interaction.tap(i * 2, 750, 1200, 900, 'forest'); }
  assert.ok(interaction.trail.length <= 40); assert.ok(interaction.pulses.length <= 12);
  interaction.step(0); assert.equal(interaction.pulses[0].age, 0);
  interaction.release();
  const particle = { x: 1 };
  for (let frame = 0; frame < 600; frame++) {
    interaction.step(1 / 60);
    const result = interaction.bend(particle, 900, 700, 1200, 900, 1 / 60);
    assert.ok(Number.isFinite(result.x)); assert.ok(Number.isFinite(result.y));
    assert.ok(Math.abs(particle.ox) <= 122);
  }
  assert.equal(interaction.trail.length, 0); assert.equal(interaction.pulses.length, 0);
  interaction.reset(); assert.equal(interaction.pointer.active, false);
});

test('cursor motion builds gently and does not flip particle offsets when crossing the pointer', () => {
  const interaction = new RainInteraction(); interaction.move(600, 400);
  const particle = { x: 1 };
  interaction.step(1 / 60); interaction.bend(particle, 630, 400, 1200, 900, 1 / 60);
  assert.ok(particle.ox > 0 && particle.ox < 1, 'no sudden displacement on the first frame');
  for (let i = 0; i < 90; i++) { interaction.step(1 / 60); interaction.bend(particle, 630, 400, 1200, 900, 1 / 60); }
  const before = particle.ox;
  interaction.move(700, 400); interaction.step(1 / 60); interaction.bend(particle, 630, 400, 1200, 900, 1 / 60);
  assert.ok(Math.abs(particle.ox - before) < 3, 'the existing drift is continuous across a gesture');
  assert.ok(interaction.pointer.x < 620, 'cursor aura follows with a little inertia');
});

test('a water impulse spreads through a damped height field without runaway energy', () => {
  const surface = new WaterSurface(80, 48); surface.disturb(.5, .5, 1.7);
  const origin = Math.floor(48 / 2) * 80 + Math.floor(80 / 2), start = surface.height[origin];
  const initial = surface.height.slice(); surface.step(0); assert.deepEqual(surface.height, initial);
  for (let i = 0; i < 60; i++) surface.step(1 / 60);
  const peakAfterOneSecond = surface.energy;
  assert.ok(Math.abs(surface.height[origin]) < Math.abs(start));
  assert.ok(surface.height.some((value, i) => Math.abs(value) > .001 && Math.abs(i % 80 - 40) > 5), 'motion reaches neighboring water');
  for (let i = 0; i < 360; i++) surface.step(1 / 60);
  assert.ok(surface.energy < peakAfterOneSecond * .25);
  for (let i = 0; i < 200; i++) surface.disturb(.5, .5, 1.7);
  for (let i = 0; i < 120; i++) {
    surface.step(1 / 60);
    assert.ok(surface.height.every(value => Number.isFinite(value) && Math.abs(value) <= 8));
  }
});
