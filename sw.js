// The build stamps a content hash and a list of only the shipped public files.
const BUILD = '__RAIN_ROOM_BUILD__';
const FILES = /* PRECACHE_FILES */ [
  './index.html', './manifest.webmanifest',
  './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable-512.png',
  './assets/audio/gentle-rain.mp3', './assets/audio/light-rain.mp3',
  './src/app.js', './src/install.js', './src/style.css', './src/scene-themes.css',
  './src/audio.js', './src/recordings.js', './src/rain-sound.js', './src/rain.js',
  './src/environment.js', './src/seasonal-environments.js', './src/cool-environments.js',
  './src/window-environment.js', './src/scenes.js', './src/storage.js', './src/timer.js'
];
const PREFIX = `rain-room:${self.registration.scope}:`;
const CACHE = PREFIX + BUILD;
const INDEX = new URL('./index.html', self.registration.scope).href;
const urls = FILES.map(file => new URL(file, self.registration.scope).href);
const allowed = new Set(urls);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try { await cache.addAll(urls.map(url => new Request(url, { cache: 'reload' }))); }
    catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      return (await (await caches.open(CACHE)).match(INDEX)) || fetch(request);
    })());
  } else if (allowed.has(url.href)) {
    event.respondWith((async () => (await (await caches.open(CACHE)).match(request)) || fetch(request))());
  }
});
