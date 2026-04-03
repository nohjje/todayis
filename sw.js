// ===========================
// Today is... - Service Worker
// ===========================

const CACHE_NAME = 'today-is-v1';

// 캐시할 파일 목록
const CACHE_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/sw-register.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/public/fonts/pretendard/pretendard.css',
  '/public/fonts/pretendard/woff2/Pretendard-Regular.woff2',
  '/public/fonts/pretendard/woff2/Pretendard-Medium.woff2',
  '/public/fonts/pretendard/woff2/Pretendard-SemiBold.woff2',
  '/public/fonts/pretendard/woff2/Pretendard-Bold.woff2',
];

// ===========================
// install — 캐시 저장
// ===========================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES))
      .then(() => self.skipWaiting())
  );
});

// ===========================
// activate — 이전 캐시 삭제
// ===========================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ===========================
// fetch — 캐시 우선 전략 (Cache First)
// 네트워크 실패 시 캐시 제공 → 오프라인 동작
// ===========================
self.addEventListener('fetch', event => {
  // POST 요청 등 캐시 불가 요청은 그냥 통과
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        // 캐시 없으면 네트워크 요청 후 캐시에 저장
        return fetch(event.request)
          .then(response => {
            // 유효한 응답만 캐시
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }
            const cloned = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
            return response;
          })
          .catch(() => {
            // 오프라인 + 캐시 없음 → index.html 반환 (SPA 폴백)
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});
