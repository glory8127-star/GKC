// GKC 구역관리 앱 Service Worker
const CACHE_NAME = 'gkc-cell-cache-v1';

const urlsToCache = [
    '/cell.html',
    '/manifest-cell.json',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// 설치 시 캐시
self.addEventListener('install', event => {
    console.log('[Cell SW] 설치 중...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Cell SW] 파일 캐싱');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// 활성화 시 이전 캐시 삭제
self.addEventListener('activate', event => {
    console.log('[Cell SW] 활성화');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME && cacheName.startsWith('gkc-cell-')) {
                        console.log('[Cell SW] 이전 캐시 삭제:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 네트워크 우선, 실패 시 캐시
self.addEventListener('fetch', event => {
    // Firebase API 요청은 항상 네트워크
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('firebase')) {
        return;
    }
    
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 성공 시 캐시 업데이트
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // 오프라인 시 캐시에서 제공
                return caches.match(event.request).then(response => {
                    if (response) {
                        console.log('[Cell SW] 캐시에서 제공:', event.request.url);
                        return response;
                    }
                    // 캐시에 없으면 오프라인 폴백
                    if (event.request.destination === 'document') {
                        return caches.match('/cell.html');
                    }
                });
            })
    );
});

// 메시지 수신 (수동 업데이트 등)
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});
