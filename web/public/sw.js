const CACHE_NAME = "rodastock-v3";
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

// Activate Event - Clean up stale caches and claim clients immediately
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

// Fetch Event - Hybrid Stale-While-Revalidate & Network-First Strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET or non-HTTP requests
  if (request.method !== "GET" || !url.protocol.startsWith("http")) return;

  const isNextStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".json") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css");

  // Strategy 1: For Static Assets (JS chunks, CSS, images, JSON data)
  // Use Cache-First with Stale-While-Revalidate
  // Allows app shell and JS scripts to load instantly when opening/closing app offline!
  if (isNextStatic) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);

        // Fetch background update if online
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        // Return cached asset immediately if available, otherwise wait for network
        return cachedResponse || (await fetchPromise) || new Response(null, { status: 404 });
      })()
    );
    return;
  }

  // Strategy 2: For Page Navigation & RSC Requests
  // Network-First with Cache Fallback + App Shell Fallback
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // Try network first when online to get latest content
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Network failed (Offline Mode) -> Fallback to Cache
        // 1. Exact match in cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        // 2. Pathname match (strip query string / RSC params)
        const pathnameResponse = await cache.match(url.pathname);
        if (pathnameResponse) return pathnameResponse;

        // 3. Page navigation fallback -> return root App Shell ("/")
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

        return new Response("Offline", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain" },
        });
      }
    })()
  );
});
