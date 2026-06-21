// public/dealer-portal-sw.js — Offline-safe service worker for the Dealer Portal PWA.
// Caches only the portal's own local static assets. No external/cross-origin requests, no API caching.
'use strict';
const CACHE = 'dealer-portal-v1';
const ASSETS = [
  '/dealer-portal.html',
  '/css/dealer-portal.css',
  '/js/dealer-portal.js',
  '/dealer-portal.webmanifest',
  '/assets/dealer-portal-icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Cache-first for same-origin static assets only. API calls (/api/...) always go to network (never cached).
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;            // never touch cross-origin
  if (url.pathname.startsWith('/api/')) return;               // never cache API/preview responses
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      if (res.ok && ASSETS.includes(url.pathname)) caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('/dealer-portal.html')))
  );
});
