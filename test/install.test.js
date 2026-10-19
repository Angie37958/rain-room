import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { setupInstall } from '../src/install.js';

test('bundled Android app hides browser installation and needs no service worker', t => {
  const elements = Object.fromEntries(['install', 'install-dialog', 'install-action', 'update-app', 'offline-status'].map(id => [id, {}]));
  for (const [key, value] of Object.entries({ window: { RainRoomAndroid: {} }, document: { getElementById: id => elements[id] } })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  setupInstall();
  assert.equal(elements.install.hidden, true);
  assert.equal(elements['update-app'].hidden, true);
  assert.equal(elements['offline-status'].textContent, '已安装 · 离线可用');
});

test('first installation hides update until a newer worker waits; explicit update refreshes once', async t => {
  class Element extends EventTarget { hidden = true; textContent = ''; close() {} }
  const ids = ['install', 'install-dialog', 'install-action', 'update-app', 'offline-status', 'close-install'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  const registration = new EventTarget();
  registration.installing = new EventTarget(); registration.waiting = null;
  const serviceWorker = new EventTarget(); serviceWorker.controller = null;
  serviceWorker.register = async () => registration;
  let ready, reloads = 0, activated = 0;
  serviceWorker.ready = new Promise(resolve => { ready = resolve; });
  const globals = { window: Object.assign(new EventTarget(), { isSecureContext: true }), document: { getElementById: id => elements[id], querySelector: () => ({}), readyState: 'complete' }, navigator: { serviceWorker }, matchMedia: () => ({ matches: false }), location: { reload() { reloads++; } } };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  setupInstall(); await setImmediate();
  registration.waiting = { postMessage() { activated++; } };
  registration.installing.dispatchEvent(new Event('statechange'));
  assert.equal(elements['update-app'].hidden, true, 'initial worker is not an app update');
  registration.waiting = null; serviceWorker.controller = {};
  serviceWorker.dispatchEvent(new Event('controllerchange'));
  ready(); await setImmediate();
  assert.equal(elements['update-app'].hidden, true); assert.equal(reloads, 0);
  assert.equal(elements['offline-status'].textContent, '已备好离线雨声');
  registration.installing = new EventTarget();
  registration.dispatchEvent(new Event('updatefound'));
  registration.waiting = { postMessage(message) { assert.equal(message.type, 'ACTIVATE_UPDATE'); activated++; } };
  registration.installing.dispatchEvent(new Event('statechange'));
  assert.equal(elements['update-app'].hidden, false);
  elements['update-app'].dispatchEvent(new Event('click')); assert.equal(activated, 1);
  registration.waiting = null;
  serviceWorker.dispatchEvent(new Event('controllerchange'));
  assert.equal(elements['update-app'].hidden, true); assert.equal(reloads, 1);
});
