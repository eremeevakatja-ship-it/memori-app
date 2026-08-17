const CACHE = 'memori-v79';
const CORE = [
  './index.html',
  './state.js',
  './audio.js',
  './learning.js',
  './words.js',
  './app.js',
  './memory.js',
  './style.css',
  './apple-touch-icon.png?v=3',
  './icon-192.png?v=3',
  './icon-192-dark.png?v=3',
  './icon-512.png?v=3',
  './icon-192-maskable.png?v=3',
  './icon-512-maskable.png?v=3',
  './icon-badge.png',
  './manifest.json'
];

// Тайм-аут мережевого запиту, після якого віддаємо кеш і не чекаємо далі.
// 🔴 Без цього застосунок здатен зависнути на "завантаженні" НАЗАВЖДИ: fetch()
// не має вбудованого тайм-ауту, і на слабкій/нестабільній мережі одразу після
// оновлення (типовий момент — телефон щойно перепідключився до Wi-Fi) запит
// може просто ніколи не завершитись. Симптом користувача — "довго грузила,
// довелось видалити й встановити знову" (живий репорт 2026-08-17).
const NETWORK_TIMEOUT_MS = 4000;

function timeoutPromise(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // Кожен файл — окремо: один невдалий fetch (тимчасовий збій мережі,
      // застряглий запит) НЕ повинен провалювати встановлення СЕРВІС-ВОРКЕРА
      // цілком — інакше телефон назавжди лишається на старій версії.
      Promise.all(CORE.map(url =>
        fetch(url, { cache: 'no-store' }).then(res => res.ok && c.put(url, res)).catch(() => {})
      ))
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    Promise.race([
      fetch(e.request, { cache: 'no-store' }),
      timeoutPromise(NETWORK_TIMEOUT_MS)
    ]).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
  );
});
