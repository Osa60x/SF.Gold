/* ============================================================
   سبائك الفخامة — Service Worker (نسخة ٤)
   إستراتيجية:
   - الصفحة (navigate): الشبكة أولاً ثم ذاكرة التخزين (تحديث فوري عند التوفر)
   - الأصول (assets): ذاكرة أولاً مع تحديث في الخلفية (سريع جداً)
   يعمل على GitHub Pages ضمن مسار فرعي (نطاق نسبي ./)
   ============================================================ */
'use strict';

const VERSION = 'sabaaek-cache-v4';
const PRECACHE = [
  './',
  './index.html',
  './site.webmanifest',
  './favicon.svg',
  './favicon.ico',
  './assets/noto-kufi-arabic-medium.ttf',
  './assets/noto-kufi-arabic-extrabold.ttf',
  './assets/fonts/saudi-riyal-regular.woff2',
  './assets/fonts/saudi-riyal-bold.woff2',
  './assets/vendor/gsap.min.js',
  './assets/vendor/ScrollTrigger.min.js',
  './assets/hero-v2.jpg',
  './assets/bg-veins.jpg',
  './assets/sabaaek-logo-user.webp',
  './assets/bullion-pamp/1g.jpg',
  './assets/bullion-pamp/2-5g.jpg',
  './assets/bullion-pamp/5g.jpg',
  './assets/bullion-pamp/10g.jpg',
  './assets/bullion-pamp/20g.jpg',
  './assets/bullion-pamp/31-1g.jpg',
  './assets/bullion-pamp/50g.jpg',
  './assets/bullion-pamp/100g.jpg',
  './sabaaek-site-qr.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then(cache => cache.put(request, copy));
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('./index.html');
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const update = fetch(request).then(res => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(VERSION).then(cache => cache.put(request, copy));
    }
    return res;
  }).catch(() => null);
  return cached || update;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // طلبات واجهات الأسعار تُترك للمتصفح مباشرة

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(staleWhileRevalidate(req));
  }
});
