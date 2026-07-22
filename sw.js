const CACHE_NAME = 'thiranflow-cache-v1';
const urlsToCache = [
  './',
  './login.html',
  './dashboard.html',
  './tasks.html',
  './users.html',
  './profile.html',
  './reports.html',
  './linkedin.html',
  './style.css',
  './dashboard.css',
  './api.js',
  './auth.js',
  './fav.png',
  './logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
