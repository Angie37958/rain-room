import test from 'node:test';
import assert from 'node:assert/strict';
import { artworkPlacement, artworkPoint } from '../src/environment.js';
import { rainMix } from '../src/recordings.js';
import { synthesizeBreeze } from '../src/audio.js';
test('portrait artwork retains its subjects on small and wide screens', () => {
  for (const [W,H] of [[320,640],[390,844],[844,390],[1280,900]]) {
    const p = artworkPlacement(W,H);
    assert.ok(p.width <= W && p.height <= H + .001);
    assert.ok(Math.abs(p.width/p.height-.6)<.0001);
    const point = artworkPoint(p.x+p.width*.65,p.y+p.height*.4,W,H);
    assert.ok(Math.abs(point.x-.65)<.0001 && Math.abs(point.y-.4)<.0001);
  }
});
test('sunny day has only a bounded seamless breeze, no rain layers', () => {
  const mix = rainMix({scene:'day'});
  assert.equal(mix.levels.bed,0); assert.equal(mix.levels.detail,0); assert.ok(mix.levels.wind>0);
  for (const samples of synthesizeBreeze(8000,3)) {
    assert.ok(samples.every(x => Number.isFinite(x) && Math.abs(x)<1));
    assert.ok(samples.some(x=>Math.abs(x)>.005));
    assert.ok(Math.abs(samples[0]-samples.at(-1))<.05);
  }
});
