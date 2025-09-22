// DigestPaper Media Service Worker
// Version: 2025-09-22-v5 (Performance optimizations + cache refresh)

const CACHE_NAME = "digestpaper-v2025-09-22-v5";
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

// Activate event - clean up old caches aggressively
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all([
        // Delete all old caches
        ...cacheNames.map(function (cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        }),
        // Also clear any problematic cached analytics requests
        caches.open(CACHE_NAME).then(cache => {
          return cache.keys().then(requests => {
            return Promise.all(
              requests.map(request => {
                if (request.url.includes('G-EQ5XCW4VZ7')) {
                  console.log('Removing cached problematic analytics request:', request.url);
                  return cache.delete(request);
                }
              })
            );
          });
        })
      ]);
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
