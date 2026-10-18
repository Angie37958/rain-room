import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';

const scope = 'https://example.com/rain-room/';
async function worker() {
  const handlers = {}, stores = new Map();
  let skipped = false;
  const cache = {
    files: [],
    async addAll(requests) { this.files = requests.map(request => request.url); },
    async match(request) { return (typeof request === 'string' ? request : request.url).endsWith('/index.html') ? new Response('cached application') : undefined; }
  };
  const context = vm.createContext({
    URL, Request, Response, Set,
    self: { registration: { scope }, location: { origin: 'https://example.com' }, clients: { async claim() {} }, skipWaiting() { skipped = true; }, addEventListener(type, fn) { handlers[type] = fn; } },
    caches: { async open(name) { if (!stores.has(name)) stores.set(name, cache); return stores.get(name); }, async keys() { return [...stores.keys()]; }, async delete(name) { return stores.delete(name); } },
    async fetch() { throw new Error('offline'); }
  });
  vm.runInContext(await readFile(new URL('../sw.js', import.meta.url), 'utf8'), context);
  return { handlers, stores, cache, skipped: () => skipped };
}

test('offline bundle covers every runtime module and both recordings within the project scope', async () => {
  const w = await worker();
  let ready;
  w.handlers.install({ waitUntil(promise) { ready = promise; } }); await ready;
  for (const file of await readdir(new URL('../src', import.meta.url))) {
    if (/\.(js|css)$/.test(file)) assert.ok(w.cache.files.includes(scope + 'src/' + file), file);
  }
  for (const file of ['index.html', 'manifest.webmanifest', 'assets/audio/gentle-rain.mp3', 'assets/audio/light-rain.mp3']) assert.ok(w.cache.files.includes(scope + file));
  assert.ok(w.cache.files.every(url => url.startsWith(scope)));
  const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url)));
  assert.equal(manifest.scope, './'); assert.equal(manifest.start_url, './'); assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const bytes = await readFile(new URL('../' + icon.src, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(bytes.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
  }
});

test('offline navigation opens the app, other origins and non-GET requests stay untouched', async () => {
  const w = await worker();
  let response;
  w.handlers.fetch({ request: { method: 'GET', url: scope, mode: 'navigate' }, respondWith(promise) { response = promise; } });
  assert.equal(await (await response).text(), 'cached application');
  for (const request of [{ method: 'POST', url: scope }, { method: 'GET', url: 'https://other.example/private' }, { method: 'GET', url: 'https://example.com/another-app/private' }]) {
    w.handlers.fetch({ request, respondWith() { assert.fail('request outside app cache'); } });
  }
});

test('cache cleanup keeps other apps and activation requires the explicit update message', async () => {
  const w = await worker();
  w.stores.set(`rain-room:${scope}:old`, {});
  w.stores.set('rain-room:https://example.com/other/:old', {});
  let done;
  w.handlers.activate({ waitUntil(promise) { done = promise; } }); await done;
  assert.equal(w.stores.has(`rain-room:${scope}:old`), false);
  assert.equal(w.stores.has('rain-room:https://example.com/other/:old'), true);
  assert.equal(w.skipped(), false);
  w.handlers.message({ data: { type: 'ACTIVATE_UPDATE' } }); assert.equal(w.skipped(), true);
});
