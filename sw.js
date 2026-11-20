// Offline support: the app shell is cached on first visit; updates are fetched in the background.
// Bump VERSION when you publish changes so returning visitors get them.
const VERSION = 'concentric-v3.0.4';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/content.js', 'js/theory.js', 'js/audio.js', 'js/scheduler.js', 'js/clock-worker.js',
  'js/render.js', 'js/groove.js', 'js/analytics.js', 'js/config.js', 'js/content-helpers.js', 'js/songs.js', 'js/lessons-extra.js',
  'js/progress.js', 'js/library.js', 'js/share.js', 'js/export.js', 'js/notation.js', 'icons/icon.svg', 'icons/icon-192.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // never touch analytics or other sites
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request).then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => cached);
    return cached || network;
  }));
});
