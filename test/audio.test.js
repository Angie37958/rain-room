import test from 'node:test';
import assert from 'node:assert/strict';
import { RainAudio } from '../src/audio.js';

function fakeContext() {
  const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  const node = () => ({ connect() {}, gain: param(), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
  return class {
    sampleRate = 8000; currentTime = 0; state = 'suspended';
    createGain = node; createBiquadFilter = node; createDynamicsCompressor = node;
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
    async decodeAudioData() {
      return { numberOfChannels: 2, sampleRate: 8000, getChannelData: () => Float32Array.from({ length: 8000 }, (_, i) => Math.sin(i / 11) * .1) };
    }
    createBuffer(channels, length, rate) { return { duration: length / rate, copyToChannel() {} }; }
    createBufferSource() { return { connect() {}, start() {} }; }
  };
}

test('recordings load once, mute gently, and change to wind without losing the sound switch', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }));
  const previous = globalThis.window;
  globalThis.window = { AudioContext: fakeContext() };
  const audio = new RainAudio();
  t.after(() => { clearTimeout(audio.suspendTimer); globalThis.window = previous; });
  assert.equal(await audio.toggle(), true);
  assert.equal(fetch.mock.calls.length, 2);
  assert.ok(audio.layers.bed.gain.value > 0);
  audio.setWeather({ scene: 'day' });
  assert.equal(audio.layers.detail.gain.value, 0);
  assert.ok(audio.layers.wind.gain.value > 0);
  audio.setWeather({ scene: 'lake' });
  assert.equal(audio.layers.bed.gain.value, 0); assert.equal(audio.layers.detail.gain.value, 0);
  assert.ok(audio.layers.wind.gain.value > 0);
  assert.equal(await audio.toggle(), false); assert.equal(audio.gain.gain.value, 0);
  assert.equal(await audio.toggle(), true); assert.equal(fetch.mock.calls.length, 2);
});

test('a missing recording does not enable silent audio, and a later retry can recover', async t => {
  let available = false;
  t.mock.method(globalThis, 'fetch', async () => ({ ok: available, arrayBuffer: async () => new ArrayBuffer(1) }));
  const previous = globalThis.window;
  globalThis.window = { AudioContext: fakeContext() };
  const audio = new RainAudio();
  t.after(() => { clearTimeout(audio.suspendTimer); globalThis.window = previous; });
  await assert.rejects(audio.toggle(), /Recording unavailable/);
  assert.equal(audio.enabled, false); assert.equal(audio.context, null);
  available = true;
  assert.equal(await audio.toggle(), true);
  assert.ok(audio.layers.bed.gain.value > 0);
});
