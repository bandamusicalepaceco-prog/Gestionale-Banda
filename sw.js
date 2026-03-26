const CACHE_NAME = 'gestionale-banda-v1';
const assets = [
  './index.html',
  './manifest.json'
  // Aggiungi qui altri file CSS o JS esterni se ne hai
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});