// Offline support: the app shell is cached on first visit. Online, files come fresh from the server.
// Bump VERSION when you publish changes so returning visitors get them.
const VERSION = 'concentric-v3.1.4';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/main.js', 'js/content.js', 'js/theory.js', 'js/audio.js', 'js/scheduler.js', 'js/clock-worker.js',
  'js/render.js', 'js/groove.js', 'js/analytics.js', 'js/config.js', 'js/content-helpers.js', 'js/songs.js', 'js/lessons-extra.js',
  'js/progress.js', 'js/library.js', 'js/share.js', 'js/export.js', 'js/notation.js', 'icons/icon.svg', 'icons/icon-192.png'
];

// Install: fetch every file fresh from the server (skip the browser's own HTTP cache), so a new VERSION
// never stores old copies.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first, so published changes show up on the next visit; the cached copy is used when the
// network is slow (over 2.5 s) or offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // never touch analytics or other sites
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request, { cache: 'no-cache' }).then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; });
    if (!cached) return network;
    const timeout = new Promise(res => setTimeout(() => res(cached), 2500));
    return Promise.race([network.catch(() => cached), timeout]);
  }));
});
