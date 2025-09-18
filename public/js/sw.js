// DigestPaper Media Service Worker
// Version: 2025-09-17-v2 (Updated to clear cache issues)

const CACHE_NAME = "digestpaper-v2025-09-17-v2";
const urlsToCache = [
  "/",
  "/css/style.css",
  "/js/app.js",
  "/js/svg-icon-enhancer.js",
  "/js/theme.js",
  "/js/consent.js",
];

// Install event - cache resources
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(urlsToCache);
    })
  );
  // Force the new service worker to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    })
  );
});
