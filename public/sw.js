const VERSION = 'fhc-v2';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const PRECACHE = ['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/assets/handoff-market-hero.webp', '/assets/handoff-market-hero-640.webp', '/icons/icon-192.png', '/icons/icon-512.png', '/privacy/', '/terms/'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(async cache => {
    const fetchFresh = async path => {
      const separator = path.includes('?') ? '&' : '?';
      const response = await fetch(new Request(`${path}${separator}precache=${VERSION}`, { cache: 'no-store' }));
      if (!response.ok) throw new Error(`Could not precache ${path}`);
      await cache.put(path, response);
      return response;
    };
    await Promise.all(PRECACHE.map(path => fetchFresh(path)));
    const html = await (await fetch(new Request(`/?precache-links=${VERSION}`, { cache: 'no-store' }))).text();
    const linkedAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
    await Promise.all(linkedAssets.map(path => fetchFresh(path)));
  }));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => ![SHELL, ASSETS].includes(key)).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone(); caches.open(SHELL).then(cache => cache.put(event.request, copy)); return response;
    }).catch(async () => (await caches.match(event.request, { ignoreVary: true })) || (await caches.match('/', { ignoreVary: true })) || caches.match('/offline.html', { ignoreVary: true })));
    return;
  }
  event.respondWith(caches.match(event.request, { ignoreVary: true }).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(ASSETS).then(cache => cache.put(event.request, copy)); }
    return response;
  })));
});
