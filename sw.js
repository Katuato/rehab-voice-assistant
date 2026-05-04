
const CACHE_NAME = 'rehab-ai-v1';


const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/config.js',
  '/js/gestures.js',
  '/js/voice.js',
  '/js/ui.js',
  '/js/calibration.js',
  '/js/camera.js',
  '/js/app.js',
  '/icons/icon-72.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];


const cdnUrls = [
  'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
];


self.addEventListener('install', event => {
  console.log('[Service Worker] Установка');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Кеширование файлов');
        return cache.addAll([...urlsToCache, ...cdnUrls]);
      })
      .catch(err => console.error('Ошибка кеширования:', err))
  );
  self.skipWaiting();
});


self.addEventListener('activate', event => {
  console.log('[Service Worker] Активация');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Удаление старого кеша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});


self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        const fetchRequest = event.request.clone();
        

        return fetch(fetchRequest)
          .then(response => {

            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            

            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {

            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Офлайн режим: нет доступа к сети', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});


self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 200, 100],
    data: {
      url: '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('RehabAI', options)
  );
});


self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});