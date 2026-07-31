const CACHE_NAME = "rodastock-v2";
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

// Fetch Event - Robust Offline Interceptor
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET or non-HTTP requests
  if (request.method !== "GET" || !url.protocol.startsWith("http")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // Try fetching over network
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          // Cache successful responses for offline fallback
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Network failed (Offline Mode)
        // 1. Try exact request match in cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        // 2. Try match by pathname without search params (stripping ?_rsc=...)
        const pathnameResponse = await cache.match(url.pathname);
        if (pathnameResponse) return pathnameResponse;

        // 3. Fallback for Page Navigation / RSC requests
        const acceptHeader = request.headers.get("accept") || "";
        const isPageOrRsc =
          request.mode === "navigate" ||
          acceptHeader.includes("text/html") ||
          acceptHeader.includes("text/x-component") ||
          url.searchParams.has("_rsc");

        if (isPageOrRsc) {
          const homeFallback = await cache.match("/");
          if (homeFallback) return homeFallback;
        }

        // Return offline response fallback
        return new Response("Offline", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain" },
        });
      }
    })()
  );
});
