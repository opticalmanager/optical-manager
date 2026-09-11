"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { warmCache } from "@/lib/offline/cache-warmer";
import {
  getPendingOfflineInvoiceCount,
  syncOfflineInvoices,
} from "@/lib/offline/invoice-queue";
import { offlineDB } from "@/lib/offline/db";

interface OfflineContextType {
  shopId: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  isInstallable: boolean;
  installPwa: () => Promise<void>;
  syncNow: () => Promise<void>;
  warmCacheNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  shopId: null,
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  isInstallable: false,
  installPwa: async () => {},
  syncNow: async () => {},
  warmCacheNow: async () => {},
});

export function useOffline() {
  return useContext(OfflineContext);
}

interface OfflineProviderProps {
  children: React.ReactNode;
  shopId?: string | null;
}

export function OfflineProvider({ children, shopId: initialShopId }: OfflineProviderProps) {
  const [shopId, setShopId] = useState<string | null>(initialShopId || null);
  // Default to true on initial render and SSR to guarantee 100% hydration match
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const isSyncingRef = useRef(false);
  const isWarmingRef = useRef(false);
  const lastPingTimeRef = useRef<number>(0);
  const isOnlineRef = useRef<boolean>(true);

  // 0. Resilient shop ID resolution across reloads
  useEffect(() => {
    if (typeof window === "undefined") return;

    async function resolveActiveShop() {
      if (initialShopId) {
        setShopId(initialShopId);
        localStorage.setItem("om_active_shop_id", initialShopId);
        try {
          await offlineDB.sync_metadata.put({
            key: "active_shop_id",
            value: initialShopId,
            updatedAt: new Date().toISOString(),
          });
        } catch {}
      } else {
        const localSaved = localStorage.getItem("om_active_shop_id");
        if (localSaved) {
          setShopId(localSaved);
        } else {
          try {
            const dbSaved = await offlineDB.sync_metadata.get("active_shop_id");
            if (dbSaved?.value) {
              setShopId(dbSaved.value);
            }
          } catch {}
        }
      }
      if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }
    }
    resolveActiveShop();
  }, [initialShopId]);

  // 1. Refresh pending count helper
  const refreshPendingCount = useCallback(async () => {
    if (!shopId) return;
    try {
      const count = await getPendingOfflineInvoiceCount(shopId);
      setPendingCount(count);
    } catch (err) {
      console.error("[OfflineProvider] Error updating pending count:", err);
    }
  }, [shopId]);

  // Helper: Active internet verification via local Next.js + Cloud DB ping
  const verifyOnlineStatus = useCallback(async (force = false, isInitial = false): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.onLine) {
      setIsOnline(false);
      isOnlineRef.current = false;
      return false;
    }
    const now = Date.now();
    // If within cooldown and not forced, preserve currently validated state
    if (!force && now - lastPingTimeRef.current < 15000) {
      return isOnlineRef.current;
    }
    lastPingTimeRef.current = now;

    const probe = async (timeoutMs: number): Promise<boolean> => {
      try {
        const dbController = new AbortController();
        const dbTimeout = setTimeout(() => dbController.abort(), timeoutMs);
        const res = await fetch("/api/offline/ping?db=1", {
          method: "HEAD",
          cache: "no-store",
          signal: dbController.signal,
        });
        clearTimeout(dbTimeout);
        return res.ok;
      } catch {
        return false;
      }
    };

    // First attempt: 4000ms probe verifying WAN internet + Neon Cloud DB reachability
    let reallyOnline = await probe(4000);

    // If initial load and first probe failed (e.g. Next.js route cold start or pooler handshake),
    // wait 1000ms and retry once with genuine DB check before toggling state
    if (!reallyOnline && isInitial && typeof navigator !== "undefined" && navigator.onLine) {
      await new Promise((r) => setTimeout(r, 1000));
      reallyOnline = await probe(4000);
    }

    setIsOnline(reallyOnline);
    isOnlineRef.current = reallyOnline;
    return reallyOnline;
  }, []);

  // 2. Perform invoice sync
  const handleSync = useCallback(async () => {
    if (!shopId || typeof navigator === "undefined" || !navigator.onLine || isSyncingRef.current) return;

    try {
      const count = await getPendingOfflineInvoiceCount(shopId);
      if (count === 0) return;

      isSyncingRef.current = true;
      setIsSyncing(true);
      const syncToast = toast.loading(`Syncing ${count} offline record${count > 1 ? "s" : ""} to cloud...`);

      const { syncedCount, failedCount } = await syncOfflineInvoices(shopId);
      await refreshPendingCount();
      setLastSyncTime(new Date());

      if (syncedCount > 0 && failedCount === 0) {
        toast.success(`Successfully synced ${syncedCount} offline record${syncedCount > 1 ? "s" : ""}!`, {
          id: syncToast,
        });
      } else if (syncedCount > 0 && failedCount > 0) {
        toast.warning(`Synced ${syncedCount} record(s), ${failedCount} pending review.`, {
          id: syncToast,
        });
      } else if (failedCount > 0) {
        toast.error(`Sync failed for ${failedCount} offline record(s). Will retry automatically.`, {
          id: syncToast,
        });
      } else {
        toast.dismiss(syncToast);
      }
    } catch (err: any) {
      console.error("[OfflineProvider] Sync failed:", err);
      if (!navigator.onLine || err?.message?.includes("fetch") || err?.name === "AbortError") {
        setIsOnline(false);
        isOnlineRef.current = false;
      }
      toast.error("Failed to sync offline records. Will retry shortly.");
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [shopId, refreshPendingCount]);

  // 3. Perform cache warming
  const handleWarmCache = useCallback(async (force = false) => {
    if (!shopId || typeof navigator === "undefined" || !navigator.onLine || isWarmingRef.current) return;
    try {
      isWarmingRef.current = true;
      const res = await warmCache(shopId, force, () => {
        setIsSyncing(true);
      });
      if (res.success) {
        setLastSyncTime(new Date());
      }
    } catch (err: any) {
      console.error("[OfflineProvider] Cache warming error:", err);
      if (!navigator.onLine || err?.message?.includes("fetch") || err?.name === "AbortError") {
        setIsOnline(false);
        isOnlineRef.current = false;
      }
    } finally {
      isWarmingRef.current = false;
      setIsSyncing(false);
    }
  }, [shopId]);

  // Store stable ref pointers for event callbacks to keep useEffect dependencies minimal
  const handleSyncRef = useRef(handleSync);
  handleSyncRef.current = handleSync;

  const handleWarmCacheRef = useRef(handleWarmCache);
  handleWarmCacheRef.current = handleWarmCache;

  const refreshPendingCountRef = useRef(refreshPendingCount);
  refreshPendingCountRef.current = refreshPendingCount;

  // 4. Initial load & listeners (runs once per shopId change, no dependency on isSyncing)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load initial sync timestamp from local IndexedDB
    offlineDB.sync_metadata
      .get("last_sync_timestamp")
      .then((meta) => {
        if (meta?.value) {
          setLastSyncTime(new Date(meta.value));
        }
      })
      .catch(() => {});

    // Ensure opt_session_profile cookie is mirrored to document.cookie for offline middleware
    if (typeof document !== "undefined" && !document.cookie.includes("opt_session_profile")) {
      offlineDB.cached_organization.toCollection().first().then((org) => {
        if (org) {
          const userSessionStr = localStorage.getItem("om_user_session");
          let parsedUser: any = null;
          if (userSessionStr) {
            try { parsedUser = JSON.parse(userSessionStr); } catch {}
          }
          const profileCookie = {
            id: parsedUser?.id || "offline-user",
            email: parsedUser?.email || org.email || "",
            fullName: parsedUser?.fullName || org.name || "Manager",
            role: parsedUser?.role || "SHOP_MANAGER",
            organizationId: org.id,
            shopId: initialShopId || org.shops?.[0]?.id || null,
            isActive: true,
          };
          document.cookie = `opt_session_profile=${encodeURIComponent(JSON.stringify(profileCookie))}; path=/; max-age=2592000; SameSite=Lax`;
        }
      }).catch(() => {});
    }

    // Active ping verification on client load to avoid false-online state
    if (navigator.onLine) {
      verifyOnlineStatus(true, true);
    } else {
      setIsOnline(false);
      isOnlineRef.current = false;
    }
    refreshPendingCountRef.current();

    // Defer background warming by 4 seconds so page interactions and initial rendering remain 100% smooth
    let warmTimer: ReturnType<typeof setTimeout> | null = null;
    if (shopId && navigator.onLine) {
      warmTimer = setTimeout(() => {
        handleWarmCacheRef.current(false);
      }, 4000);
    }

    const handleOnlineEvent = async () => {
      const isReallyOnline = await verifyOnlineStatus(true);
      if (!isReallyOnline) return;

      toast.success("Internet connection active", { duration: 3000 });
      handleSyncRef.current();
      setTimeout(() => {
        handleWarmCacheRef.current(false);
      }, 2000);
    };

    const handleOfflineEvent = () => {
      setIsOnline(false);
      isOnlineRef.current = false;
      toast.info("Offline mode active. You can continue creating bills using cached data.", {
        duration: 5000,
      });
      refreshPendingCountRef.current();
    };

    const handleFocusEvent = () => {
      if (navigator.onLine) {
        verifyOnlineStatus(true);
      } else {
        setIsOnline(false);
        isOnlineRef.current = false;
      }
    };

    // PWA beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen to messages from Service Worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "TRIGGER_BACKGROUND_SYNC") {
        handleSyncRef.current();
      }
    };

    // Listen to local Dexie updates (e.g. offline mutation or invoice queued)
    const handleDatabankUpdate = () => {
      refreshPendingCountRef.current();
    };

    window.addEventListener("online", handleOnlineEvent);
    window.addEventListener("offline", handleOfflineEvent);
    window.addEventListener("focus", handleFocusEvent);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("offline-databank-updated", handleDatabankUpdate);
    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    // Periodic sync check every 60 seconds if online
    const intervalId = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine && shopId) {
        refreshPendingCountRef.current();
        handleSyncRef.current();
      }
    }, 60000);

    return () => {
      if (warmTimer) clearTimeout(warmTimer);
      window.removeEventListener("online", handleOnlineEvent);
      window.removeEventListener("offline", handleOfflineEvent);
      window.removeEventListener("focus", handleFocusEvent);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("offline-databank-updated", handleDatabankUpdate);
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
      clearInterval(intervalId);
    };
  }, [shopId, verifyOnlineStatus]);

  // 5. Install Desktop PWA trigger
  const installPwa = async () => {
    if (!deferredPrompt) {
      toast.info(
        "💡 To install on desktop: Click the Install icon in the right side of your Chrome / Edge URL bar at the top, or click Menu (⋮) → 'Install Optical Manager'.",
        { duration: 7000 }
      );
      return;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        toast.success("Optical Manager Desktop App installed successfully!");
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (err) {
      console.error("[PWA] Installation prompt failed:", err);
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        shopId: shopId || null,
        isOnline,
        isSyncing,
        pendingCount,
        lastSyncTime,
        isInstallable,
        installPwa,
        syncNow: handleSync,
        warmCacheNow: () => handleWarmCache(true),
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}
