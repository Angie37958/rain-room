import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { loopChannel, RECORDINGS } from '../src/recordings.js';

test('packaged CC0 recordings are the checked source files', async () => {
  const hashes = { bed: '5fffe1bb4acdd51270b0fa84614be3fa354155b08f60881f4fe12fd0ff53f423', detail: '97eba2ec0bfb826268057b379b9c4d3522bba8544f21d8fd3da75a2850ada56e' };
  for (const [kind, url] of Object.entries(RECORDINGS)) {
    const bytes = await readFile(url);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes[kind]);
  }
});

test('crossfade removes a discontinuity between a recording tail and head', () => {
  const input = Float32Array.from({ length: 1000 }, (_, i) => i / 999 * .8 - .4);
  const loop = loopChannel(input, 100, 2);
  assert.equal(loop.length, 800);
  assert.ok(Math.abs(loop[0] - loop.at(-1)) < .002);
  assert.ok(Math.abs(loop[199] - loop[200]) < .002);
  assert.deepEqual(loop.slice(200), input.slice(200, 800));
  assert.equal(input[0], Math.fround(-.4));
});
