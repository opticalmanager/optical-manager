// Optical Manager PWA Service Worker (v15 - Resilient Zero-Latency Offline Engine)
const CACHE_NAME = "optical-manager-cache-v15";

// Core static assets to precache on install (static shell only — zero heavy SSR pages to avoid compilation storms)
const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/optical-manager%20logo.svg",
];

// 1. Install event: Immediately skip waiting to take over from any stale worker
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map(async (asset) => {
            try {
              const res = await fetch(asset, { cache: "no-store" });
              if (res && res.status === 200) {
                await cache.put(asset, res);
              }
            } catch (err) {
              console.warn("[SW] Asset precache skipped:", asset);
            }
          })
        );
      })
  );
});

// 2. Activate event: Immediately purge ALL older caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Purging legacy cache bucket:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch event: Fast Network-Race for navigations/RSC, Cache-Fallback when offline
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // CRITICAL: Only handle same-origin requests. Never intercept cross-origin traffic (e.g. gstatic.com ping, Supabase, external APIs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests and non-http protocols (chrome-extension, ws, etc.)
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Never intercept Turbopack HMR, WebSockets, auth endpoints, or Server Actions
  if (
    url.pathname.includes("/_next/webpack-hmr") ||
    url.pathname.includes("__turbopack__") ||
    url.pathname.startsWith("/api/") ||
    request.headers.get("x-action")
  ) {
    return;
  }

  // 0. FAST CACHE-FIRST for static immutable Next.js chunks
  // Filenames in /_next/static/ contain content hashes and never change once built
  if (url.pathname.startsWith("/_next/static/") && !url.pathname.includes("__turbopack__")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.status === 200) {
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          return cached || new Response("", { status: 404 });
        }
      })
    );
    return;
  }

  // A. Navigations & Next.js RSC Flight Streams
  const isNavigationOrRsc =
    request.mode === "navigate" ||
    request.headers.get("RSC") === "1" ||
    url.searchParams.has("_rsc");

  if (isNavigationOrRsc) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // 1. When online, prioritize live network response with generous safety ceiling (15s)
        // Never abort at 2.5s; serverless cold starts and SSR pages in production take 2.5s-4s.
        if (navigator.onLine) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000); // 15 seconds

            const networkResponse = await fetch(request, { signal: controller.signal });
            clearTimeout(timer);

            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              cache.put(request, clone);
              if (request.mode === "navigate") {
                cache.put(url.pathname, networkResponse.clone());
              }
              return networkResponse;
            }
          } catch (netErr) {
            // Network timed out or connection dropped - fall through to offline cache
            console.warn("[SW] Online fetch failed or timed out, falling back to cache:", url.pathname);
          }
        }

        // 2. Offline or network failed: check exact cached route or clean pathname
        const exactCached =
          (await cache.match(request)) ||
          (await cache.match(url.pathname, { ignoreSearch: true }));

        if (exactCached) {
          return exactCached;
        }

        // 3. Fallback safely from cache without crashing or hijacking
        return handleOfflineFallback(request, url, cache);
      })()
    );
    return;
  }

  // B. Standard static assets (images, icons, styles)
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        return cached || new Response("Offline", { status: 503 });
      }
    })
  );
});

// Helper: Offline Fallback with ZERO Route Hijacking
async function handleOfflineFallback(request, url, cache) {
  // 1. Next.js RSC Flight requests (_rsc query param or RSC: 1 header)
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    let cachedRsc =
      (await cache.match(request)) ||
      (await cache.match(request, { ignoreSearch: true }));
    if (cachedRsc) return cachedRsc;

    const cleanRscReq = new Request(url.pathname, { headers: { RSC: "1" } });
    cachedRsc = await cache.match(cleanRscReq, { ignoreSearch: true });
    if (cachedRsc) return cachedRsc;

    const plainCached = await cache.match(url.pathname, { ignoreSearch: true });
    if (plainCached) {
      if (plainCached.headers.get("content-type")?.includes("text/x-component")) {
        return plainCached;
      }
    }

    // CRITICAL: NEVER return a 307 redirect for uncached RSC flight requests!
    // A 307 redirect instructs the browser/router to follow with the RSC header,
    // which dumps raw RSC Flight JSON strings (0:{"f":...}) directly on a blank screen.
    // Return a clean 503 so the client App Router handles the offline boundary gracefully.
    return new Response(null, {
      status: 503,
      statusText: "Service Unavailable (Offline)",
    });
  }

  // 2. Full Page Navigations (HTML documents)
  if (request.mode === "navigate") {
    const cachedPage =
      (await cache.match(request)) ||
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(url.pathname)) ||
      (await cache.match(url.pathname, { ignoreSearch: true })) ||
      (await cache.match(url.pathname.replace(/\/$/, "")));

    if (cachedPage) {
      return cachedPage;
    }

    // Module-specific fallback instead of blanket dashboard redirect!
    if (url.pathname.startsWith("/shop/customers")) {
      const customersPage = await cache.match("/shop/customers", { ignoreSearch: true });
      if (customersPage) return customersPage;
    }

    if (url.pathname.startsWith("/shop/invoices")) {
      const invoicesPage = await cache.match("/shop/invoices", { ignoreSearch: true });
      if (invoicesPage) return invoicesPage;
    }

    if (url.pathname.startsWith("/shop/orders")) {
      const ordersPage = await cache.match("/shop/orders", { ignoreSearch: true });
      if (ordersPage) return ordersPage;
    }

    if (url.pathname.startsWith("/shop/returns")) {
      const returnsPage = await cache.match("/shop/returns", { ignoreSearch: true });
      if (returnsPage) return returnsPage;
    }

    if (url.pathname.startsWith("/shop/inventory")) {
      const inventoryPage = await cache.match("/shop/inventory", { ignoreSearch: true });
      if (inventoryPage) return inventoryPage;
    }

    if (url.pathname.startsWith("/shop/settings")) {
      const settingsPage = await cache.match("/shop/settings", { ignoreSearch: true });
      if (settingsPage) return settingsPage;
    }

    if (url.pathname.startsWith("/shop/support")) {
      const supportPage = await cache.match("/shop/support", { ignoreSearch: true });
      if (supportPage) return supportPage;
    }

    if (url.pathname.startsWith("/shop/analytics")) {
      const analyticsPage = await cache.match("/shop/analytics", { ignoreSearch: true });
      if (analyticsPage) return analyticsPage;
    }

    if (url.pathname.startsWith("/owner")) {
      const ownerPage =
        (await cache.match("/owner", { ignoreSearch: true })) ||
        (await cache.match("/owner/shops", { ignoreSearch: true }));
      if (ownerPage) return ownerPage;
    }

    // If still unmatched, return informative offline UI with explicit UTF-8 charset
    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline - Optical Manager</title><meta name='viewport' content='width=device-width, initial-scale=1.0'></head><body style='font-family:system-ui,-apple-system,sans-serif;padding:48px 24px;text-align:center;background:#f8fafc;color:#1e293b;'><div style='max-width:460px;margin:0 auto;background:white;padding:32px;border-radius:16px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.05);border:1px solid #e2e8f0;'><div style='width:48px;height:48px;border-radius:12px;background:#fef3c7;color:#d97706;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:24px;'>⚡</div><h2 style='margin:0 0 8px 0;font-size:20px;font-weight:700;'>Offline Mode Active</h2><p style='color:#64748b;font-size:14px;line-height:1.5;margin:0 0 24px 0;'>The requested view (<code>${url.pathname}</code>) has not been cached in offline databank yet.</p><div style='display:flex;gap:12px;justify-content:center;'><a href='/shop/dashboard' style='padding:10px 20px;border-radius:10px;background:#0a52c3;color:white;text-decoration:none;font-weight:600;font-size:13px;'>Go to Dashboard</a><button onclick='window.location.reload()' style='padding:10px 20px;border-radius:10px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;cursor:pointer;font-weight:600;font-size:13px;'>Retry</button></div></div></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // 3. Any other resource (images, CSS, JS) from cache
  const cachedAny = (await cache.match(request)) || (await cache.match(request, { ignoreSearch: true }));
  if (cachedAny) return cachedAny;

  return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
}

// 4. Background Sync: handle 'sync-offline-invoices'
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-invoices") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "TRIGGER_BACKGROUND_SYNC" });
        });
      })
    );
  }
});

// 5. Message handling: immediate skip waiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
