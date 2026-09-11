"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registerSW = async () => {
      try {
        // Proactively purge legacy caches directly from window
        if ("caches" in window) {
          try {
            const keys = await window.caches.keys();
            await Promise.all(
              keys.map((k) => (k !== "optical-manager-cache-v15" ? window.caches.delete(k) : Promise.resolve()))
            );
          } catch {}
        }

        // Cache-busting URL ensures browser fetches fresh service worker script
        const registration = await navigator.serviceWorker.register("/sw.js?v=20260911_v15", {
          scope: "/",
        });

        // Proactively check for worker updates on every page load
        await registration.update();

        // If a new worker is waiting, activate it immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // When a new worker is discovered and installed, tell it to take over
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                installingWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });

        // Request background sync permission / registration if supported
        if ("sync" in registration) {
          try {
            await (registration as any).sync.register("sync-offline-invoices");
          } catch (syncErr) {
            // Background sync not supported or failed (normal in some browsers)
          }
        }
      } catch (error) {
        console.warn("[PWA] Service Worker registration failed:", error);
      }
    };

    registerSW();
  }, []);

  return null;
}
