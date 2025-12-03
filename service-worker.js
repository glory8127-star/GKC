// Service Worker for GKC (Sacramento Glory Korean Church)
const CACHE_NAME = 'gkc-cache-v9';

// 캐시할 파일 목록
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/logo.png'
];

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('[GKC ServiceWorker] 설치 중...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[GKC ServiceWorker] 캐시 저장 완료');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.log('[GKC ServiceWorker] 캐시 실패:', err);
      })
  );
});

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('[GKC ServiceWorker] 활성화');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[GKC ServiceWorker] 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 네트워크 요청 처리 (Network First 전략)
self.addEventListener('fetch', (event) => {
  // Firebase 및 외부 API 요청은 캐시하지 않음
  if (event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('youtube.com') ||
      event.request.url.includes('ytimg.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 유효한 응답이면 캐시에 저장
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // 오프라인일 때 캐시에서 응답
        return caches.match(event.request);
      })
  );
});
