// Optical Manager PWA Service Worker (v18 - Fail-Safe Isolated RSC & Offline Engine)
const CACHE_VERSION = "v18";
const CACHE_STATIC = `optical-manager-static-${CACHE_VERSION}`;
const CACHE_HTML = `optical-manager-html-${CACHE_VERSION}`;
const CACHE_RSC = `optical-manager-rsc-${CACHE_VERSION}`;

// Core static assets and offline fallback page to precache on install
const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/optical-manager%20logo.svg",
];

// 1. Install event: Immediately skip waiting to take over from any stale worker
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      // Precache static assets
      caches.open(CACHE_STATIC).then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map(async (asset) => {
            try {
              const res = await fetch(asset, { cache: "no-store" });
              if (res && res.status === 200 && !res.redirected) {
                const contentType = res.headers.get("content-type") || "";
                if (contentType.includes("text/html")) {
                  const htmlCache = await caches.open(CACHE_HTML);
                  await htmlCache.put(asset, res.clone()).catch(() => {});
                } else {
                  await cache.put(asset, res).catch(() => {});
                }
              }
            } catch (err) {
              console.warn("[SW] Asset precache skipped:", asset);
            }
          })
        );
      }),
    ]).catch((err) => {
      console.warn("[SW] Precache initialization error ignored:", err);
    })
  );
});

// 2. Activate event: Purge ALL legacy and mismatched cache buckets
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_STATIC, CACHE_HTML, CACHE_RSC];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!currentCaches.includes(cacheName)) {
              console.log("[SW] Purging legacy cache bucket:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
      .catch((err) => {
        console.warn("[SW] Cache activate cleanup error:", err);
      })
  );
});

// 3. Fetch event: Strictly Isolated Routing for HTML Navigations, RSC Flight Streams & Static Chunks
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip non-GET requests and non-http protocols
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Never intercept Turbopack HMR, WebSockets, auth APIs, or Server Actions
  if (
    url.pathname.includes("/_next/webpack-hmr") ||
    url.pathname.includes("__turbopack__") ||
    url.pathname.startsWith("/api/") ||
    request.headers.get("x-action")
  ) {
    return;
  }

  // ─── 0. FAST CACHE-FIRST FOR STATIC IMMUTABLE ASSETS ───
  // Next.js chunks in /_next/static/ contain hashes and never change once built
  if (url.pathname.startsWith("/_next/static/") && !url.pathname.includes("__turbopack__")) {
    event.respondWith(
      caches.open(CACHE_STATIC).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.status === 200 && !res.redirected) {
            cache.put(request, res.clone()).catch(() => {});
          }
          return res;
        } catch {
          return cached || new Response("", { status: 404 });
        }
      }).catch(() => fetch(request).catch(() => new Response("", { status: 404 })))
    );
    return;
  }

  // ─── A. NEXT.JS RSC FLIGHT REQUESTS (Client-side Link clicks / Prefetching) ───
  const isRscRequest = request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");

  if (isRscRequest && request.mode !== "navigate") {
    event.respondWith(
      (async () => {
        if (navigator.onLine) {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
              const contentType = networkResponse.headers.get("content-type") || "";
              // ONLY store in RSC cache if genuine flight stream
              if (contentType.includes("text/x-component")) {
                try {
                  const rscCache = await caches.open(CACHE_RSC);
                  rscCache.put(url.pathname, networkResponse.clone()).catch(() => {});
                  rscCache.put(request, networkResponse.clone()).catch(() => {});
                } catch {}
              }
            }
            return networkResponse;
          } catch (netErr) {
            console.warn("[SW] Live RSC fetch failed:", url.pathname);
          }
        }

        // Offline: Check RSC Cache ONLY
        try {
          const rscCache = await caches.open(CACHE_RSC);
          const cachedRsc =
            (await rscCache.match(request)) ||
            (await rscCache.match(url.pathname, { ignoreSearch: true }));

          if (cachedRsc) {
            const contentType = cachedRsc.headers.get("content-type") || "";
            // Strictly ensure we only return text/x-component to Next.js client router
            if (contentType.includes("text/x-component")) {
              return cachedRsc;
            }
          }
        } catch (rscErr) {
          console.warn("[SW] RSC cache lookup error:", rscErr);
        }

        // CRITICAL: NEVER return HTML or 307 to an RSC request when offline!
        // Returning a 503 tells Next.js router that flight stream is unavailable,
        // allowing it to safely fall back to full document navigation without throwing React JSON syntax errors.
        return new Response(null, {
          status: 503,
          statusText: "Service Unavailable (Offline)",
        });
      })().catch((err) => {
        console.error("[SW] Fatal RSC handler error prevented:", err);
        return new Response(null, { status: 503 });
      })
    );
    return;
  }

  // ─── B. FULL DOCUMENT NAVIGATIONS (Browser Address Bar / Hard Reload) ───
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        if (navigator.onLine) {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse) {
              // Cache clean 200 OK HTML responses into CACHE_HTML
              if (networkResponse.status === 200 && !networkResponse.redirected) {
                const contentType = networkResponse.headers.get("content-type") || "";
                if (contentType.includes("text/html")) {
                  try {
                    const htmlCache = await caches.open(CACHE_HTML);
                    htmlCache.put(request, networkResponse.clone()).catch(() => {});
                    htmlCache.put(url.pathname, networkResponse.clone()).catch(() => {});
                  } catch {}
                }
              }
              return networkResponse;
            }
          } catch (netErr) {
            console.warn("[SW] Live navigation failed, checking offline HTML cache:", url.pathname);
          }
        }

        // Offline Navigation: Search CACHE_HTML with STRICT text/html validation
        try {
          const htmlCache = await caches.open(CACHE_HTML);
          
          // 1. Check exact requested route
          const exactCached =
            (await htmlCache.match(request)) ||
            (await htmlCache.match(url.pathname)) ||
            (await htmlCache.match(url.pathname, { ignoreSearch: true })) ||
            (await htmlCache.match(url.pathname.replace(/\/$/, "")));

          if (exactCached) {
            const contentType = exactCached.headers.get("content-type") || "";
            // STRICT VALIDATION: Under NO circumstances return an RSC flight stream to a browser navigation!
            if (contentType.includes("text/html")) {
              return exactCached;
            } else {
              console.warn("[SW] Discarded non-HTML response found in HTML cache for:", url.pathname);
            }
          }

          // 2. Check cached dashboard shell for shop routes
          if (url.pathname.startsWith("/shop/")) {
            const dashboardShell = await htmlCache.match("/shop/dashboard", { ignoreSearch: true });
            if (dashboardShell && dashboardShell.headers.get("content-type")?.includes("text/html")) {
              return dashboardShell;
            }
          }

          // 3. Check cached dedicated /offline fallback page
          const offlinePage =
            (await htmlCache.match("/offline", { ignoreSearch: true })) ||
            (await htmlCache.match("/offline"));

          if (offlinePage && offlinePage.headers.get("content-type")?.includes("text/html")) {
            return offlinePage;
          }

          // 4. Ultimate fail-safe: Embedded standalone high-density offline UI
          return new Response(
            `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Offline Mode | Optical Manager</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F6F7F9; color: #1E293B; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
    .card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; max-width: 480px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); overflow: hidden; text-align: center; }
    .header { background: linear-gradient(135deg, #F59E0B, #EA580C); padding: 32px 24px; color: #FFFFFF; }
    .icon-box { display: inline-flex; padding: 12px; background: rgba(255, 255, 255, 0.2); border-radius: 14px; margin-bottom: 12px; }
    .title { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
    .subtitle { font-size: 13px; opacity: 0.95; line-height: 1.4; }
    .body { padding: 28px 24px; }
    .badge { display: inline-block; padding: 6px 12px; background: #FEF3C7; color: #92400E; border-radius: 8px; font-size: 12px; font-weight: 700; margin-bottom: 20px; }
    .desc { font-size: 13px; color: #64748B; line-height: 1.5; margin-bottom: 24px; }
    .actions { display: flex; flex-direction: column; gap: 10px; }
    .btn-primary { padding: 12px 20px; border-radius: 12px; background: #0A52C3; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 13px; border: none; cursor: pointer; display: block; }
    .btn-secondary { padding: 12px 20px; border-radius: 12px; background: #F1F5F9; color: #334155; text-decoration: none; font-weight: 700; font-size: 13px; border: 1px solid #CBD5E1; cursor: pointer; display: block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon-box">⚡</div>
      <div class="title">Offline Mode Active</div>
      <div class="subtitle">Optical Manager local databanks remain ready for counter billing.</div>
    </div>
    <div class="body">
      <div class="badge">No Internet Connection</div>
      <p class="desc">The requested view (<code>${url.pathname}</code>) has not been cached yet. You can continue creating bills using local cached records.</p>
      <div class="actions">
        <a href="/shop/dashboard" class="btn-primary">Go to Shop Dashboard</a>
        <a href="/shop/invoices/new" class="btn-secondary">New Offline Invoice</a>
        <button onclick="window.location.reload()" class="btn-secondary">Retry Connection</button>
      </div>
    </div>
  </div>
</body>
</html>`,
            {
              headers: { "Content-Type": "text/html; charset=utf-8" },
              status: 200,
            }
          );
        } catch (navErr) {
          console.error("[SW] Fatal offline navigation error:", navErr);
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body style="font-family:sans-serif;padding:40px;text-align:center;"><h2>Offline Mode</h2><p>Please check your connection and <a href="javascript:location.reload()">retry</a>.</p></body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })().catch((fatalErr) => {
        console.error("[SW] Fatal navigation rejection prevented:", fatalErr);
        return new Response("Service Unavailable", { status: 503 });
      })
    );
    return;
  }

  // ─── C. STANDARD STATIC ASSETS (Images, Icons, Fonts) ───
  event.respondWith(
    caches.open(CACHE_STATIC).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      } catch {
        return cached || new Response("Offline", { status: 503 });
      }
    }).catch(() => fetch(request).catch(() => new Response("Offline", { status: 503 })))
  );
});

// 4. Background Sync: dispatch event to active clients
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-invoices") {
    event.waitUntil(
      self.clients
        .matchAll()
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "TRIGGER_BACKGROUND_SYNC" });
          });
        })
        .catch((err) => {
          console.warn("[SW] Background sync dispatch skipped:", err);
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
