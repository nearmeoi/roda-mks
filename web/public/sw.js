const CACHE_NAME = "rodastock-v1";
const STATIC_ASSETS = [
  "/",
  "/guide",
  "/so-week",
  "/rekomendasi",
  "/manifest.json",
  "/icon.png",
  "/logo.png",
  "/all_stock.json",
  "/pos_outlets.json",
  "/pos_outlet_stock.json",
];

// Install Event - Pre-cache essential static assets & data
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch Event - Hybrid Caching Strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or chrome-extension requests
  if (request.method !== "GET" || !url.protocol.startsWith("http")) return;

  // Strategy 1: Static assets & Next.js immutable bundles -> Stale While Revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js|json)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategy 2: Page Navigation (HTML) -> Network First, Fallback to Cache
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          // Fallback to home page if specific route is not cached
          return caches.match("/");
        })
    );
    return;
  }

  // Default Network First with Cache Fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
