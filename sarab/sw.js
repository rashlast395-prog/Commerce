const CACHE_NAME = 'richyeat-v2';
const urlsToCache = [
  './',
  './index.html',
  './css/bootstrap.min.css',
  './css/all.min.css',
  './css/style.css',
  './css/aos.css',
  './css/swiper-bundle.min.css',
  './css/magnific-popup.css',
  './js/jquery-3.7.1.min.js',
  './js/bootstrap.bundle.min.js',
  './js/aos.js',
  './js/swiper-bundle.min.js',
  './js/jquery.magnific-popup.min.js',
  './js/firebase.js',
  './js/main.js',
  './img/banner-img.jpg',
  './img/about1.jpg',
  './img/about2.jpg',
  './img/off-img.jpg',
  './img/portfolio/work1.jpg',
  './img/portfolio/work2.jpg',
  './img/portfolio/work3.jpg',
  './img/portfolio/work4.jpg',
  './img/portfolio/work5.jpg'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  /* Network-first: always try the live server (Vite) first so edits show
     immediately, then fall back to cache when offline. */
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        /* Cache a copy of successful GET responses for offline use */
        if (event.request.method === 'GET' && response && response.status === 200 && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copy); });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          if (event.request.destination === 'document') {
            return caches.match('./offline.html');
          }
        });
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
