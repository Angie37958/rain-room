import test from 'node:test';
import assert from 'node:assert/strict';
import { RainInteraction, containsWater } from '../src/interaction.js';

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
  assert.ok(left.ox < -70); assert.ok(right.ox > 70);
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
  assert.ok(interaction.trail.length <= 12); assert.ok(interaction.pulses.length <= 12);
  interaction.step(0); assert.equal(interaction.pulses[0].age, 0);
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
