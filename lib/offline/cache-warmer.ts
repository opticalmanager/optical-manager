import { offlineDB, type CachedCustomer, type CachedInventory } from "./db";

const CACHE_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown unless forced

export async function warmCache(
  shopId: string,
  force = false,
  onStart?: () => void
): Promise<{ success: boolean; message: string }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { success: false, message: "Offline — cannot refresh cache" };
  }

  if (!shopId) {
    return { success: false, message: "No active shop ID provided" };
  }

  try {
    const metaKey = `last_cache_warm_${shopId}`;
    const lastWarmRecord = await offlineDB.sync_metadata.get(metaKey);
    const lastSyncRecord = await offlineDB.sync_metadata.get(`last_sync_timestamp_${shopId}`);

    // Check if we already have offline customer/inventory data persisted
    const existingCount = await offlineDB.cached_customers.where("shopId").equals(shopId).count();

    if (!force && lastWarmRecord?.value && existingCount > 0) {
      const lastWarmTime = new Date(lastWarmRecord.value).getTime();
      if (Date.now() - lastWarmTime < CACHE_COOLDOWN_MS) {
        return { success: true, message: "Cache is already up to date" };
      }
    }

    // Notify caller that actual network sync is starting
    onStart?.();

    // Ensure strictly isolated shop data
    await offlineDB.ensureShopDataIsolation(shopId);

    // Build URL: use ?since= if we already have cached records and a previous sync timestamp
    let syncUrl = "/api/offline/sync-all";
    const canDoIncremental = !force && existingCount > 0 && Boolean(lastSyncRecord?.value);
    if (canDoIncremental) {
      syncUrl += `?since=${encodeURIComponent(lastSyncRecord!.value)}`;
    }

    // Fetch offline databank from server
    let syncRes = await fetch(syncUrl, { cache: "no-store" });
    
    if (syncRes.ok) {
      const syncData = await syncRes.json();
      const customers: CachedCustomer[] = syncData.customers || [];
      const inventoryItems: CachedInventory[] = syncData.inventory || [];
      const appointments = syncData.appointments || [];
      const orders = syncData.orders || [];
      const invoices = syncData.invoices || [];
      const returns = syncData.returns || [];
      const shop = syncData.shop || null;
      const organization = syncData.organization || null;
      const isIncremental = Boolean(syncData.isIncremental);

      await offlineDB.bulkSaveAllShopData({
        shopId,
        shop,
        organization,
        customers,
        inventory: inventoryItems,
        appointments,
        orders,
        invoices,
        returns,
        isIncremental,
      });

      const syncIso = syncData.timestamp || new Date().toISOString();
      await offlineDB.sync_metadata.put({
        key: metaKey,
        value: syncIso,
        updatedAt: syncIso,
      });
      await offlineDB.sync_metadata.put({
        key: `last_sync_timestamp_${shopId}`,
        value: syncIso,
        updatedAt: syncIso,
      });
      await offlineDB.sync_metadata.put({
        key: "last_sync_timestamp",
        value: syncIso,
        updatedAt: syncIso,
      });

      // Dispatch global window event so active views can hydrate from IndexedDB
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("offline-databank-updated", {
            detail: { shopId, timestamp: syncIso, isIncremental },
          })
        );
      }

      console.log(
        `[OfflineCache] Synchronized ${isIncremental ? "incremental" : "full"} databank for shop ${shopId}: ` +
        `${customers.length} customers, ${inventoryItems.length} inventory, ` +
        `${appointments.length} appointments, ${orders.length} orders`
      );

      const userSession = await offlineDB.getUserSessionOffline();
      precacheAppRoutes(userSession?.role).catch(() => {});

      return {
        success: true,
        message: `Offline databank synchronized (${customers.length} patients, ${inventoryItems.length} products, ${appointments.length} appointments, ${orders.length} orders)`,
      };
    }

    // Fallback to legacy parallel endpoints if sync-all endpoint encounters unexpected issue
    const [custRes, invRes] = await Promise.all([
      fetch("/api/offline/customers", { cache: "no-store" }),
      fetch("/api/offline/inventory", { cache: "no-store" }),
    ]);

    if (!custRes.ok || !invRes.ok) {
      console.warn("[OfflineCache] Server databanks unavailable (status:", custRes.status, invRes.status, ")");
      return {
        success: false,
        message: "Offline databanks temporarily unavailable from cloud. Continuing with local offline storage.",
      };
    }

    const custData = await custRes.json();
    const invData = await invRes.json();

    const customers: CachedCustomer[] = (custData.customers || []).map((c: any) => ({
      id: c.id,
      shopId: c.shopId,
      organizationId: c.organizationId,
      registrationId: c.registrationId,
      fullName: c.fullName,
      email: c.email || null,
      phone: c.phone,
      dateOfBirth: c.dateOfBirth ? String(c.dateOfBirth) : null,
      gender: c.gender || null,
      bloodGroup: c.bloodGroup || null,
      referredBy: c.referredBy || null,
      address: c.address || null,
      city: c.city || null,
      state: c.state || null,
      pincode: c.pincode || null,
      storeCredit: c.storeCredit ? String(c.storeCredit) : "0.00",
      updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    }));

    const inventoryItems: CachedInventory[] = (invData.inventory || []).map((i: any) => ({
      id: i.id,
      shopId: i.shopId,
      organizationId: i.organizationId,
      name: i.name,
      category: i.category,
      brand: i.brand || null,
      model: i.model || null,
      sku: i.sku || null,
      price: i.price ? String(i.price) : "0.00",
      quantity: typeof i.quantity === "number" ? i.quantity : 0,
      isActive: Boolean(i.isActive),
      cgstPercent: i.cgstPercent ? String(i.cgstPercent) : "0.00",
      sgstPercent: i.sgstPercent ? String(i.sgstPercent) : "0.00",
      igstPercent: i.igstPercent ? String(i.igstPercent) : "0.00",
      updatedAt: i.updatedAt ? new Date(i.updatedAt).toISOString() : new Date().toISOString(),
    }));

    // Atomically bulk put into IndexedDB
    await offlineDB.transaction("rw", [offlineDB.cached_customers, offlineDB.cached_inventory, offlineDB.sync_metadata], async () => {
      await offlineDB.cached_customers.where("shopId").equals(shopId).delete();
      await offlineDB.cached_inventory.where("shopId").equals(shopId).delete();

      if (customers.length > 0) {
        await offlineDB.cached_customers.bulkPut(customers);
      }
      if (inventoryItems.length > 0) {
        await offlineDB.cached_inventory.bulkPut(inventoryItems);
      }

      await offlineDB.sync_metadata.put({
        key: metaKey,
        value: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    console.log(`[OfflineCache] Cached ${customers.length} customers and ${inventoryItems.length} inventory items for shop ${shopId}`);

    const userSession = await offlineDB.getUserSessionOffline();
    precacheAppRoutes(userSession?.role).catch(() => {});

    return {
      success: true,
      message: `Offline databank updated (${customers.length} patients, ${inventoryItems.length} products)`,
    };
  } catch (error: any) {
    console.error("[OfflineCache] Cache warming failed:", error);
    return { success: false, message: error.message || "Failed to warm offline cache" };
  }
}

export const CORE_SHOP_ROUTES = [
  "/shop/dashboard",
  "/shop/orders",
  "/shop/customers",
  "/shop/inventory",
  "/shop/appointments",
  "/shop/returns",
  "/shop/invoices",
  "/shop/invoices/new",
  "/shop/patients/new",
  "/shop/returns/new",
  "/shop/inventory/add",
];

export const CORE_OWNER_ROUTES = [
  "/owner",
  "/owner/shops",
  "/owner/reports",
  "/owner/analytics",
  "/owner/promotions",
  "/owner/settings",
  "/owner/settings/appointments",
  "/owner/settings/email",
  "/owner/shop-managers",
  "/owner/support",
];

export async function precacheAppRoutes(role?: string): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine || !("caches" in window)) {
    return;
  }

  // In development mode, Turbopack compiles every requested route on the fly.
  // Precaching dozens of routes creates severe CPU lockups and Neon DB pool exhaustion.
  if (process.env.NODE_ENV === "development") {
    return;
  }

  try {
    const cache = await caches.open("optical-manager-cache-v15");
    const routesToPrecache =
      role === "OWNER"
        ? [...CORE_OWNER_ROUTES, ...CORE_SHOP_ROUTES]
        : role === "SHOP_MANAGER"
        ? CORE_SHOP_ROUTES
        : [...CORE_OWNER_ROUTES, ...CORE_SHOP_ROUTES];

    // Warm routes sequentially with idle delays to avoid server overload
    for (const route of routesToPrecache) {
      try {
        const match = await cache.match(route);
        if (!match) {
          const res = await fetch(route);
          if (res && res.status === 200) {
            await cache.put(route, res);
          }
          // 800ms idle delay between requests
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      } catch {}
    }
  } catch (err) {
    console.warn("[precacheAppRoutes] Warning:", err);
  }
}

export const precacheShopRoutes = precacheAppRoutes;
