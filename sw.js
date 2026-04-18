/* ============================================================
   Service Worker – Gestionale Banda Musicale
   Strategia: Cache-first per asset statici, Network-first
   per le chiamate API Google Drive.
   ============================================================ */

const CACHE_NAME = 'gestionale-banda-v4';

// File da mettere in cache all'installazione
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Lato:wght@300;400;700&display=swap'
];

// URL da NON mettere in cache (API Google)
const NETWORK_ONLY = [
  'googleapis.com',
  'accounts.google.com',
  'oauth2'
];

// ── Installazione: precache delle risorse principali ──────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Impossibile cachare:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Attivazione: pulizia vecchie cache ───────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: strategia mista ────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Le chiamate alle API Google vanno sempre in rete
  if (NETWORK_ONLY.some(pattern => url.includes(pattern))) {
    event.respondWith(fetch(event.request).catch(() =>
      new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // Per tutto il resto: Cache-first, poi rete come fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Salva in cache solo risposte valide
        if (
          response &&
          response.status === 200 &&
          response.type !== 'opaque' &&
          event.request.method === 'GET'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback: se l'utente è offline e chiede la pagina principale
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ── Messaggi dall'app (es. forzare aggiornamento cache) ───────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
